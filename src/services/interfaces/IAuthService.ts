import { RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginResponseDto } from '../../dto/auth/login.dto';
import { 
    LoginInput, 
    RegisterInput, 
    VerifyOtpInput, 
    ResetPasswordInput, 
    ChangePasswordInput, 
    GoogleLoginInput,
    ForgotPasswordSchema,
    ResendOtpInput
} from '../../dto/auth/auth.schema';
import { z } from 'zod';

type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export interface IAuthService {
    register(data: RegisterInput): Promise<RegisterResponseDto>;
    login(data: LoginInput): Promise<LoginResponseDto>;
    verifyOtp(data: VerifyOtpInput): Promise<LoginResponseDto>;
    resendOtp(data: ResendOtpInput): Promise<void>;
    forgotPassword(data: ForgotPasswordInput): Promise<void>;
    resetPassword(data: ResetPasswordInput): Promise<void>;
    changePassword(userId: string, data: ChangePasswordInput): Promise<void>;
    googleLogin(data: GoogleLoginInput): Promise<LoginResponseDto>;
    refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
}
