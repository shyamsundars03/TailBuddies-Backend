import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IOtpRepository } from '../../repositories/interfaces/IOtpRepository';
import { RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginResponseDto } from '../../dto/auth/login.dto';
import { IAuthService } from '../interfaces/IAuthService';
import { IJwtService } from '../interfaces/IJwtService';
import { IEmailService } from '../interfaces/IEmailService';
import { IAdminRepository } from '../../repositories/interfaces/IAdminRepository';
import { 
    VerifyOtpInput, 
    LoginInput, 
    RegisterInput, 
    ResendOtpInput, 
    ResetPasswordInput, 
    ChangePasswordInput, 
    GoogleLoginInput,
    ForgotPasswordSchema
} from '../../dto/auth/auth.schema';
import { UserRole } from '../../enums/user-role.enum';
import { Gender } from '../../enums/gender.enum';
import { ErrorMessages, HttpStatus } from '../../constants';
import { AppError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../../errors/app-error';
import { UserMapper } from '../../utils/user.mapper';
import { z } from 'zod';
import logger from '../../logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { IUser } from '../../models/user.models';

type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export class AuthService implements IAuthService {
  private readonly _userRepository: IUserRepository;
  private readonly _otpRepository: IOtpRepository;
  private readonly _adminRepository: IAdminRepository;
  private readonly _jwtService: IJwtService;
  private readonly _emailService: IEmailService;

  constructor(
    userRepository: IUserRepository,
    otpRepository: IOtpRepository,
    adminRepository: IAdminRepository,
    jwtService: IJwtService,
    emailService: IEmailService
  ) {
    this._userRepository = userRepository;
    this._otpRepository = otpRepository;
    this._adminRepository = adminRepository;
    this._jwtService = jwtService;
    this._emailService = emailService;
  }

  private generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async sendOtpToEmail(email: string): Promise<string> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this._otpRepository.createOtp(email, otp, expiresAt);
    const sent = await this._emailService.sendOTP(email, otp);
    if (!sent) {
      logger.error('Failed to send OTP email', { email });
      throw new AppError(ErrorMessages.OTP_SEND_FAILED || 'OTP sending failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    logger.info('OTP sent', { email });
    return otp;
  }

  async login(data: LoginInput): Promise<LoginResponseDto> {
    const { email, password, role } = data;

    const user = await this._userRepository.findUserWithPassword(email);
    if (!user) {
      throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
    }

    if (role && user.role !== role) {
      throw new ConflictError(`Account already exists with role ${user.role}. Please sign in with correct role.`);
    }

    if (user.isBlocked) {
      throw new ForbiddenError(ErrorMessages.ACCOUNT_BLOCKED);
    }

    if (!user.isVerified) {
      throw new ForbiddenError(ErrorMessages.ACCOUNT_NOT_VERIFIED);
    }

    if (!user.password) {
      throw new UnauthorizedError('This account uses Google Sign-in. Please use the Google button.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
    }

    const accessToken = this._jwtService.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = this._jwtService.generateRefreshToken({ userId: user.id });

    return {
      ...UserMapper.toResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async googleLogin(data: GoogleLoginInput): Promise<LoginResponseDto> {
    try {
      const { idToken, role } = data;
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
      }

      const { email, sub: googleId, name: username, picture: profilePic } = payload;
      const targetRole = role.toLowerCase();

      let user = await this._userRepository.findByEmail(email);

      if (user) {
        if (user.role.toLowerCase() !== targetRole) {
          throw new ConflictError(`Account already exists with role ${user.role}. Please sign in with correct role.`);
        }

        if (user.isBlocked) {
          throw new ForbiddenError(ErrorMessages.ACCOUNT_BLOCKED);
        }

        if (!user.googleId) {
          await this._userRepository.update(user.id, {
            googleId,
            profilePic: user.profilePic || profilePic,
            isVerified: true
          });
        }
      } else {
        user = await this._userRepository.create({
          username,
          email,
          googleId,
          profilePic,
          role: targetRole as UserRole,
          isVerified: true,
        } as Partial<IUser>);
      }

      const accessToken = this._jwtService.generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = this._jwtService.generateRefreshToken({ userId: user.id });

      return {
        ...UserMapper.toResponse(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Google Login Error Detail:', error);
      throw error;
    }
  }

  async register(data: RegisterInput): Promise<RegisterResponseDto> {
    const { username, email, role } = data;

    const existingUser = await this._userRepository.findByEmail(email);
    if (existingUser) {
      if (existingUser.role !== role) {
        throw new ConflictError(`Account already exists with role ${existingUser.role}. Please sign in.`);
      }
      throw new ConflictError(ErrorMessages.EMAIL_EXISTS);
    }

    await this.sendOtpToEmail(email);
    logger.info('User registration pending, OTP sent', { email });

    return {
      id: '',
      username,
      email,
      phone: data.phone || '',
      role: data.role || '',
      isVerified: false,
    };
  }

  async verifyOtp(data: VerifyOtpInput): Promise<LoginResponseDto> {
    const { email, otp, userData, purpose } = data;

    try {
      const otpDoc = await this._otpRepository.findOtp(email);
      if (!otpDoc || otpDoc.otp !== otp) {
        throw new ValidationError(!otpDoc ? ErrorMessages.OTP_EXPIRED : ErrorMessages.INVALID_OTP);
      }

      let user: IUser | null;
      if (userData) {
        user = await this.handleUserRegistration(email, userData as RegisterInput);
      } else {
        user = await this.handleUserVerification(email);
      }

      if (!user) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);

      if (purpose !== 'reset') {
        await this._otpRepository.deleteOtp(email);
      }

      const accessToken = this._jwtService.generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = this._jwtService.generateRefreshToken({ userId: user.id });

      logger.info('User verified via OTP', { userId: user.id, email });

      return {
        ...UserMapper.toResponse(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Verify OTP Error:', error);
      throw error;
    }
  }

  private async handleUserRegistration(email: string, userData: RegisterInput): Promise<IUser> {
    const existingUser = await this._userRepository.findByEmail(email);
    if (existingUser) return existingUser;

    const { username, phone, password, gender, role } = userData;
    const genderKey = gender ? (gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()) : '';
    const genderMap: Record<string, Gender> = {
      'Male': Gender.MALE,
      'Female': Gender.FEMALE,
      'Other': Gender.OTHER
    };

    const targetRole = role?.toLowerCase() === 'doctor' ? UserRole.DOCTOR : UserRole.OWNER;
    
    return await this._userRepository.create({
      username,
      email,
      phone,
      password,
      gender: genderMap[genderKey],
      role: targetRole,
      isVerified: true,
    } as Partial<IUser>);
  }

  private async handleUserVerification(email: string): Promise<IUser | null> {
    const user = await this._userRepository.findByEmail(email);
    if (!user) return null;
    
    return await this._userRepository.update(user.id, { isVerified: true });
  }

  async resendOtp(data: ResendOtpInput): Promise<void> {
    await this.sendOtpToEmail(data.email);
    logger.info('OTP resent', { email: data.email });
  }

  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    const user = await this._userRepository.findByEmail(data.email);
    if (!user) {
      logger.warn('Forgot password for non-existent email', { email: data.email });
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    await this.sendOtpToEmail(data.email);
    logger.info('Forgot password OTP sent', { email: data.email });
  }

  async resetPassword(data: ResetPasswordInput): Promise<void> {
    const { email, otp, newPassword } = data;
    const otpDoc = await this._otpRepository.findOtp(email);
    if (!otpDoc || otpDoc.otp !== otp) {
      throw new ValidationError(!otpDoc ? ErrorMessages.OTP_EXPIRED : ErrorMessages.INVALID_OTP);
    }

    const user = await this._userRepository.findUserWithPassword(email);
    if (!user) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);

    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new ValidationError('New password must be different from the current password');
      }
    }

    await this._userRepository.updatePassword(user.id, newPassword);
    await this._otpRepository.deleteOtp(email);
    logger.info('Password reset successfully', { email });
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const { currentPassword, newPassword } = data;
    const user = await this._userRepository.findById(userId);
    if (!user) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);

    const userWithPassword = await this._userRepository.findUserWithPassword(user.email);
    if (!userWithPassword || !userWithPassword.password) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isMatch) {
      throw new UnauthorizedError(ErrorMessages.INVALID_CURRENT_PASSWORD);
    }

    await this._userRepository.updatePassword(userId, newPassword);
    logger.info('Password changed successfully', { userId });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || '';
      const decoded = this._jwtService.verifyToken(refreshToken, secret) as { userId: string };
      
      if (!decoded?.userId) {
        throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
      }

      const user = await this._userRepository.findById(decoded.userId);
      if (user) {
        if (user.isBlocked) throw new ForbiddenError(ErrorMessages.ACCOUNT_BLOCKED);
        return {
          accessToken: this._jwtService.generateAccessToken({ userId: user.id, role: user.role })
        };
      }

      const admin = await this._adminRepository.findOne({ _id: decoded.userId });
      if (admin) {
        return {
          accessToken: this._jwtService.generateAccessToken({ userId: admin.id, role: 'admin' })
        };
      }

      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    } catch (error) {
      logger.error('Refresh Token Error:', error);
      throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
    }
  }
}
