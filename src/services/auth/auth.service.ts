import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { RegisterDto, RegisterResponseDto } from '../../dto/auth/register.dto';
import { LoginDto, LoginResponseDto } from '../../dto/auth/login.dto';
import { IAuthService } from '../interfaces/IAuthService';
import { IJwtService } from '../interfaces/IJwtService';
import { IEmailService } from '../interfaces/IEmailService';
import { UserRole } from '../../enums/user-role.enum';
import { Gender } from '../../enums/gender.enum';
import { ErrorMessages } from '../../constants';
import logger from '../../logger';
import bcrypt from 'bcryptjs';

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJwtService,
    private readonly emailService: IEmailService
  ) { }

  async login(data: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = data;

    const user = await this.userRepository.findUserWithPassword(email);
    if (!user) {
      throw new Error(ErrorMessages.INVALID_CREDENTIALS);
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
      accessToken,
      refreshToken,
    };
  }

  async register(data: RegisterDto): Promise<RegisterResponseDto> {
    const { username, email, phone, password, gender, role } = data;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error(ErrorMessages.EMAIL_EXISTS);
    }

    const genderMap: Record<string, Gender> = {
      'Male': Gender.MALE,
      'Female': Gender.FEMALE,
      'Other': Gender.OTHER
    };

    const user = await this.userRepository.create({
      userName: username,
      email,
      phone,
      password,
      gender: gender ? genderMap[gender] : undefined,
      role: (role as UserRole) || UserRole.OWNER,
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      id: user.id,
      userName: user.userName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}