import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IOtpRepository } from '../../repositories/interfaces/IOtpRepository';
import { IUserService } from '../interfaces/IUserService';
import { IEmailService } from '../interfaces/IEmailService';
import { AppError } from '../../errors/app-error';
import { HttpStatus, ErrorMessages } from '../../constants';
import logger from '../../logger';
import crypto from 'crypto';
import { IUser } from '../../models/user.models';

export class UserService implements IUserService {
    
    
    
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly otpRepository: IOtpRepository,
        private readonly emailService: IEmailService
    ) { }




    private generateOtp(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    async getUserProfile(userId: string): Promise<IUser> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }
        return user;
    }









    async updateUserProfile(userId: string, data: Partial<IUser>): Promise<IUser> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

       
        if (data.userName) user.userName = data.userName;
        if (data.phone !== undefined) user.phone = data.phone;
        if (data.gender) user.gender = data.gender;
        if (data.address !== undefined) user.address = data.address;
        if (data.city !== undefined) user.city = data.city;
        if (data.state !== undefined) user.state = data.state;
        if (data.country !== undefined) user.country = data.country;
        if (data.pincode !== undefined) user.pincode = data.pincode;

        const updatedUser = await user.save();
        logger.info('User profile updated', { userId, fields: Object.keys(data) });
        return updatedUser;
    }





    async updateProfilePic(userId: string, profilePic: string): Promise<IUser> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        user.profilePic = profilePic;
        await user.save();
        return user;
    }













    async initiateEmailChange(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
        await this.otpRepository.createOtp(user.email, otp, expiresAt);

        await this.emailService.sendOTP(user.email, otp);
        logger.info('Email change OTP sent to current email', { email: user.email });
    }

















    async verifyCurrentEmail(userId: string, otp: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        const otpDoc = await this.otpRepository.findOtp(user.email);
        if (!otpDoc || otpDoc.otp !== otp) {
            throw new AppError(ErrorMessages.INVALID_OTP, HttpStatus.BAD_REQUEST);
        }

        await this.otpRepository.deleteOtp(user.email);
        logger.info('Current email verified for change', { userId });
    }










    async sendOtpToNewEmail(userId: string, newEmail: string): Promise<void> {
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.otpRepository.createOtp(newEmail, otp, expiresAt);

        await this.emailService.sendOTP(newEmail, otp);
        logger.info('Email change OTP sent to new email', { newEmail });
    }














    async verifyNewEmail(userId: string, newEmail: string, otp: string): Promise<IUser> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        const otpDoc = await this.otpRepository.findOtp(newEmail);
        if (!otpDoc || otpDoc.otp !== otp) {
            throw new AppError(ErrorMessages.INVALID_OTP, HttpStatus.BAD_REQUEST);
        }

     
        user.email = newEmail.toLowerCase();
        await user.save();

        await this.otpRepository.deleteOtp(newEmail);
        logger.info('Email changed successfully', { userId, newEmail });

        return user;
    }




    
}
