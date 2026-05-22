import { IUser } from '../../models/user.models';
import { UpdateProfileInput, VerifyNewEmailInput, ProfilePicInput, OtpInput, NewEmailInput } from '../../dto/user/user.schema';

export interface IUserService {
    getUserProfile(userId: string): Promise<IUser>;
    updateUserProfile(userId: string, data: UpdateProfileInput): Promise<IUser>;
    updateProfilePic(userId: string, data: ProfilePicInput): Promise<IUser>;
    initiateEmailChange(userId: string): Promise<void>;
    verifyCurrentEmail(userId: string, data: OtpInput): Promise<void>;
    sendOtpToNewEmail(userId: string, data: NewEmailInput): Promise<void>;
    verifyNewEmail(userId: string, data: VerifyNewEmailInput): Promise<IUser>;
}
