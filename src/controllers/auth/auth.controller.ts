import { Request, Response } from 'express';
import { IAuthService } from '../../services/interfaces/IAuthService';
import { HttpStatus, SuccessMessages } from '../../constants';
import logger from '../../logger';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';

export class AuthController {
  constructor(private readonly authService: IAuthService) { }

  login = async (req: Request, res: Response): Promise<void> => {
    const data: LoginDto = req.body;
    const result = await this.authService.login(data);

    res.status(HttpStatus.OK).json({
      success: true,
      message: SuccessMessages.LOGIN,
      data: result,
    });
  };

  register = async (req: Request, res: Response): Promise<void> => {
    const data: RegisterDto = req.body;

    logger.info('📥 Registration request received', {
      email: data.email,
      username: data.username
    });

    const user = await this.authService.register(data);

    logger.info('✅ Registration successful', { userId: user.id });

    res.status(HttpStatus.CREATED).json({
      success: true,
      message: SuccessMessages.REGISTER,
      data: user,
    });
  };
}