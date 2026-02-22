import { Request, Response } from 'express';
import { IAuthService } from '../../services/interfaces/IAuthService';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';

export class AuthController {
  constructor(private readonly authService: IAuthService) { }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: LoginDto = req.body;
      const result = await this.authService.login(data);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.LOGIN,
        data: result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ErrorMessages.INVALID_CREDENTIALS;
      logger.error('❌ Login failed', { message });
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: message || ErrorMessages.INVALID_CREDENTIALS,
      });
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('❌ Registration failed', {
        message: err.message,
        stack: err.stack
      });

      const status =
        err.message === ErrorMessages.EMAIL_EXISTS ||
          err.message === ErrorMessages.PHONE_EXISTS ||
          err.message === ErrorMessages.PASSWORD_MISMATCH
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;

      res.status(status).json({
        success: false,
        message: err.message || ErrorMessages.INTERNAL_SERVER,
      });
    }
  };
}