import { RegisterDto, RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginDto, LoginResponseDto } from '../../dto/auth/login.dto';

export interface IAuthService {
    register(data: RegisterDto): Promise<RegisterResponseDto>;
    login(data: LoginDto): Promise<LoginResponseDto>;
}
