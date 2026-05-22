import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IOtpRepository } from '../../repositories/interfaces/IOtpRepository';
import { IUserService } from '../interfaces/IUserService';
import { IEmailService } from '../interfaces/IEmailService';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { ErrorMessages } from '../../constants';
import logger from '../../logger';
import crypto from 'crypto';
import { IUser } from '../../models/user.models';
import { UpdateProfileInput, VerifyNewEmailInput, ProfilePicInput, OtpInput, NewEmailInput } from '../../dto/user/user.schema';

export class UserService implements IUserService {
    
    
    
    private readonly _userRepository: IUserRepository;
    private readonly _otpRepository: IOtpRepository;
    private readonly _emailService: IEmailService;

    constructor(
        userRepository: IUserRepository,
        otpRepository: IOtpRepository,
        emailService: IEmailService
    ) {
        this._userRepository = userRepository;
        this._otpRepository = otpRepository;
        this._emailService = emailService;
    }




    private generateOtp(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    async getUserProfile(userId: string): Promise<IUser> {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }
        return user;
    }









    async updateUserProfile(userId: string, data: UpdateProfileInput): Promise<IUser> {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }

        const updatedUser = await this._userRepository.update(userId, {
            username: data.username,
            phone: data.phone,
            gender: data.gender,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            pincode: data.pincode
        });
        
        if (!updatedUser) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        
        logger.info('User profile updated', { userId, fields: Object.keys(data) });
        return updatedUser;
    }





    async updateProfilePic(userId: string, data: ProfilePicInput): Promise<IUser> {
        const { profilePic } = data;
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }

        const updatedUser = await this._userRepository.update(userId, { profilePic });
        if (!updatedUser) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        return updatedUser;
    }













    async initiateEmailChange(userId: string): Promise<void> {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }

        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
        await this._otpRepository.createOtp(user.email, otp, expiresAt);

        await this._emailService.sendOTP(user.email, otp);
        logger.info('Email change OTP sent to current email', { email: user.email });
    }

















    async verifyCurrentEmail(userId: string, data: OtpInput): Promise<void> {
        const { otp } = data;
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }

        const otpDoc = await this._otpRepository.findOtp(user.email);
        if (!otpDoc || otpDoc.otp !== otp) {
            throw new ValidationError(ErrorMessages.INVALID_OTP);
        }

        await this._otpRepository.deleteOtp(user.email);
        logger.info('Current email verified for change', { userId });
    }










    async sendOtpToNewEmail(userId: string, data: NewEmailInput): Promise<void> {
        const { newEmail } = data;
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this._otpRepository.createOtp(newEmail, otp, expiresAt);

        await this._emailService.sendOTP(newEmail, otp);
        logger.info('Email change OTP sent to new email', { newEmail });
    }














    async verifyNewEmail(userId: string, data: VerifyNewEmailInput): Promise<IUser> {
        const { newEmail, otp } = data;
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
        }

        const otpDoc = await this._otpRepository.findOtp(newEmail);
        if (!otpDoc || otpDoc.otp !== otp) {
            throw new ValidationError(ErrorMessages.INVALID_OTP);
        }

     
        const updatedUser = await this._userRepository.update(userId, { email: newEmail.toLowerCase() });
        if (!updatedUser) throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);

        await this._otpRepository.deleteOtp(newEmail);
        logger.info('Email changed successfully', { userId, newEmail });

        return updatedUser;
    }




    
}
