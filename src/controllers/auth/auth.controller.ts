import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../../services/interfaces/IAuthService';
import { AppError } from '../../errors/app-error';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';

// Helper to get message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Helper to get statusCode from unknown error (for AppError instances)
function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode: unknown }).statusCode;
    if (typeof statusCode === 'number') return statusCode;
  }
  return undefined;
}













export class AuthController {




  constructor(private readonly authService: IAuthService) { }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {


      const data: LoginDto = req.body;
      const result = await this.authService.login(data);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.LOGIN,
        data: result,
      });

    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg === ErrorMessages.INVALID_CREDENTIALS) {
        return next(new AppError(ErrorMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED));
      }
      if (msg === ErrorMessages.ACCOUNT_BLOCKED || msg === ErrorMessages.ACCOUNT_NOT_VERIFIED) {
        return next(new AppError(msg, HttpStatus.FORBIDDEN));
      }
      next(error);
    }
  };












  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterDto = req.body;

      logger.info('Registration request received', {
        email: data.email,
        username: data.username
      });

      const user = await this.authService.register(data);

      logger.info('Registration successful, OTP sent', { userId: user.id });

      res.status(HttpStatus.CREATED).json({
        success: true,
        message: SuccessMessages.OTP_SENT,
        data: user,
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (
        msg === ErrorMessages.EMAIL_EXISTS ||
        msg === ErrorMessages.PHONE_EXISTS ||
        msg.includes('Account already exists')
      ) {
        return next(new AppError(msg, HttpStatus.CONFLICT));
      }
      next(error);
    }
  };













  googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idToken, role } = req.body;
      const result = await this.authService.googleLogin(idToken, role);

      
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.LOGIN,
        data: {
          user: {
            id: result.id,
            userName: result.userName,
            email: result.email,
            role: result.role,
          },
          accessToken: result.accessToken,
        },
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg?.includes('Account already exists')) {
        return next(new AppError(msg, HttpStatus.CONFLICT));
      }
      next(error);
    }
  };













  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp, userData } = req.body;
      const result = await this.authService.verifyOtp(email, otp, userData);

      
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.OTP_VERIFIED,
        data: {
          user: {
            id: result.id,
            userName: result.userName,
            email: result.email,
            role: result.role,
          },
          accessToken: result.accessToken,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  };














  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new AppError(ErrorMessages.REQUIRED_FIELD, HttpStatus.BAD_REQUEST));
      }

      await this.authService.resendOtp(email);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.OTP_SENT,
      });
    } catch (error: unknown) {
      next(error);
    }
  };












  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new AppError(ErrorMessages.REQUIRED_FIELD, HttpStatus.BAD_REQUEST));
      }

      await this.authService.forgotPassword(email);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.PASSWORD_RESET_OTP_SENT,
      });
    } catch (error: unknown) {
      
      const statusCode = getErrorStatus(error);
      if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
        return next(error);
      }
      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.PASSWORD_RESET_OTP_SENT,
      });
    }
  };













  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return next(new AppError(ErrorMessages.REQUIRED_FIELD, HttpStatus.BAD_REQUEST));
      }

      await this.authService.resetPassword(email, otp, newPassword);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.PASSWORD_RESET,
      });
    } catch (error: unknown) {
      next(error);
    }
  };













  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as Request & { user?: { userId: string } }).user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        return next(new AppError(ErrorMessages.REQUIRED_FIELD, HttpStatus.BAD_REQUEST));
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);

      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.PASSWORD_CHANGED,
      });
    } catch (error: unknown) {
      next(error);
    }
  };









}
