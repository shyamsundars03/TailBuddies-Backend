import { IUser } from '../models/user.models';

export interface UserResponseDto {
    id: string;
    username: string;
    email: string;
    role: string;
    phone?: string;
    gender?: string;
    profilePic?: string;
}

export class UserMapper {
    static toResponse(user: IUser): UserResponseDto {
        return {
            id: user.id || String(user._id),
            username: user.username,
            email: user.email,
            role: user.role,
            phone: user.phone,
            gender: user.gender,
            profilePic: user.profilePic,
        };
    }
}
