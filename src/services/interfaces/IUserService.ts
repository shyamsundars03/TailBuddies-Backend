import { IUser } from '../../models/user.models';

export interface IUserService {
    getUserProfile(userId: string): Promise<IUser>;
    updateUserProfile(userId: string, data: Partial<IUser>): Promise<IUser>;
    updateProfilePic(userId: string, profilePic: string): Promise<IUser>;
    initiateEmailChange(userId: string): Promise<void>;
    verifyCurrentEmail(userId: string, otp: string): Promise<void>;
    sendOtpToNewEmail(userId: string, newEmail: string): Promise<void>;
    verifyNewEmail(userId: string, newEmail: string, otp: string): Promise<IUser>;
}
