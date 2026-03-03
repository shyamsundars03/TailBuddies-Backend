import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IOtpRepository } from '../../repositories/interfaces/IOtpRepository';
import { RegisterDto, RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginDto, LoginResponseDto } from '../../dto/auth/login.dto';
import { IAuthService } from '../interfaces/IAuthService';
import { IJwtService } from '../interfaces/IJwtService';
import { IEmailService } from '../interfaces/IEmailService';
import { UserRole } from '../../enums/user-role.enum';
import { Gender } from '../../enums/gender.enum';
import { AppError } from '../../errors/app-error';


import { HttpStatus, ErrorMessages } from '../../constants';
import logger from '../../logger';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { IUser } from '../../models/user.models';






export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly jwtService: IJwtService,
    private readonly emailService: IEmailService
  ) { }



  ///////////////////////////////////Helpers 

  private generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async sendOtpToEmail(email: string): Promise<string> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.otpRepository.createOtp(email, otp, expiresAt);
    const sent = await this.emailService.sendOTP(email, otp);
    if (!sent) {
      logger.error('Failed to send OTP email', { email });
      throw new Error(ErrorMessages.OTP_SEND_FAILED);
    }
    logger.info('OTP sent', { email });
    return otp;
  }













  /////////////////////////////////// Login 
  async login(data: LoginDto): Promise<LoginResponseDto> {



    const { email, password, role } = data;

    const user = await this.userRepository.findUserWithPassword(email);
    if (!user) {
      throw new Error(ErrorMessages.INVALID_CREDENTIALS);
    }

    // Check role mismatch
    if (role && user.role !== role) {
      throw new Error(`Account already exists with role ${user.role}. Please sign in with correct role.`);
    }

    // Check blocked
    if (user.isBlocked) {
      throw new Error(ErrorMessages.ACCOUNT_BLOCKED);
    }

    // Check verified
    if (!user.isVerified) {
      throw new Error(ErrorMessages.ACCOUNT_NOT_VERIFIED);
    }

    //(Google users)
    if (!user.password) {
      throw new Error('This account uses Google Sign-in. Please use the Google button.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error(ErrorMessages.INVALID_CREDENTIALS);
    }



    const accessToken = this.jwtService.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = this.jwtService.generateRefreshToken({ userId: user.id });

    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      gender: user.gender,
      profilePic: user.profilePic,
      accessToken,
      refreshToken,
    };





  }






  ////////////////////////////////// Google Login 




  async googleLogin(idToken: string, role: string): Promise<LoginResponseDto> {



    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error(ErrorMessages.INVALID_CREDENTIALS);
      }

      const { email, sub: googleId, name: userName, picture: profilePic } = payload;
      const targetRole = role.toLowerCase();

      let user = await this.userRepository.findByEmail(email);

      if (user) {




        if (user.role.toLowerCase() !== targetRole) {
          throw new Error(`Account already exists with role ${user.role}. Please sign in with correct role.`);
        }

        // Check blocked for existing Google user
        if (user.isBlocked) {
          throw new Error(ErrorMessages.ACCOUNT_BLOCKED);
        }







        if (!user.googleId) {
          user.googleId = googleId;
          if (!user.profilePic) user.profilePic = profilePic;
          user.isVerified = true;
          await user.save();
        }




      } else {

        user = await this.userRepository.create({
          userName,
          email,
          googleId,
          profilePic,
          role: targetRole as UserRole,
          isVerified: true,
        } as Partial<IUser>);


      }

      const accessToken = this.jwtService.generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = this.jwtService.generateRefreshToken({ userId: user.id });

      return {
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        profilePic: user.profilePic,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Google Login Error Detail:', error);
      throw error;
    }
  }














  /////////////////////////////////// Register 

  async register(data: RegisterDto): Promise<RegisterResponseDto> {




    const { username, email, role } = data;


    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      if (existingUser.role !== role) {
        throw new Error(`Account already exists with role ${existingUser.role}. Please sign in.`);
      }
      throw new Error(ErrorMessages.EMAIL_EXISTS);
    }



    await this.sendOtpToEmail(email);

    logger.info('User registration pending, OTP sent', { email });

    return {
      id: '',
      userName: username,
      email: email,
      phone: data.phone || '',
      role: data.role || '',
      isVerified: false,
    };
  }














  /////////////////////////////////// Verify OTP 

  async verifyOtp(email: string, otp: string, userData?: unknown): Promise<LoginResponseDto> {



    try {
      const otpDoc = await this.otpRepository.findOtp(email);
      if (!otpDoc) {
        throw new AppError(ErrorMessages.OTP_EXPIRED, HttpStatus.BAD_REQUEST);
      }

      if (otpDoc.otp !== otp) {
        throw new AppError(ErrorMessages.INVALID_OTP, HttpStatus.BAD_REQUEST);
      }



      let user;
      if (userData) {
        const { username, phone, password, gender, role } = userData as RegisterDto;


        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
          user = existingUser;
        } else {


          const genderKey = gender ? (gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()) : '';
          const genderMap: Record<string, Gender> = {
            'Male': Gender.MALE,
            'Female': Gender.FEMALE,
            'Other': Gender.OTHER
          };


          const targetRole = role?.toLowerCase() === 'doctor' ? UserRole.DOCTOR : UserRole.OWNER;

          logger.info('Creating new user from OTP verification', { email, role: targetRole });

          user = await this.userRepository.create({
            userName: username,
            email,
            phone,
            password,
            gender: genderMap[genderKey] || undefined,
            role: targetRole,
            isVerified: true,
          } as Partial<IUser>);

        }
      } else {



        user = await this.userRepository.findByEmail(email);
        if (!user) {
          throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }
        user.isVerified = true;
        await user.save();

      }


      await this.otpRepository.deleteOtp(email);


      const accessToken = this.jwtService.generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = this.jwtService.generateRefreshToken({ userId: user.id });

      logger.info('User verified and created via OTP', { userId: user.id, email });

      return {
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        profilePic: user.profilePic,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Verify OTP Error Detail:', error);
      throw error;
    }
  }


  ////////////////////////////////// Resend OTP 

  async resendOtp(email: string): Promise<void> {
    await this.sendOtpToEmail(email);
    logger.info('OTP resent', { email });
  }











  ////////////////////////////////// Forgot Password 

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      logger.warn('Forgot password for non-existent email', { email });
      return;
    }

    await this.sendOtpToEmail(email);
    logger.info('Forgot password OTP sent', { email });
  }

  ////////////////////////////////// Reset Password 

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const otpDoc = await this.otpRepository.findOtp(email);
    if (!otpDoc) {
      throw new Error(ErrorMessages.OTP_EXPIRED);
    }

    if (otpDoc.otp !== otp) {
      throw new Error(ErrorMessages.INVALID_OTP);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    user.password = newPassword;
    await user.save();

    await this.otpRepository.deleteOtp(email);
    logger.info('Password reset via OTP', { email });
  }
















  ////////////////////////////////// Change Password 

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    const userWithPassword = await this.userRepository.findUserWithPassword(user.email);
    if (!userWithPassword || !userWithPassword.password) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isMatch) {
      throw new Error(ErrorMessages.INVALID_CREDENTIALS);
    }

    userWithPassword.password = newPassword;
    await userWithPassword.save();
    logger.info('Password changed', { userId });
  }












}
