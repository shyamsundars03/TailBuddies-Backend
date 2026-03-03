import { RegisterDto, RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginDto, LoginResponseDto } from '../../dto/auth/login.dto';

export interface IAuthService {
    register(data: RegisterDto): Promise<RegisterResponseDto>;
    login(data: LoginDto): Promise<LoginResponseDto>;
    verifyOtp(email: string, otp: string, userData?: unknown): Promise<LoginResponseDto>;

    resendOtp(email: string): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(email: string, otp: string, newPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    googleLogin(idToken: string, role: string): Promise<LoginResponseDto>;
    refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
}
