import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../../services/interfaces/IAuthService';
import { AppError } from '../../errors/app-error';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';
import { env } from '../../config/env';


function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class AuthController {
  constructor(private readonly authService: IAuthService) { }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginDto = req.body;
      const result = await this.authService.login(data);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.jwtRefreshMaxAge,
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
            phone: result.phone,
            gender: result.gender,
            profilePic: result.profilePic,
          },
          accessToken: result.accessToken,
        },
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
      logger.info('Registration request received', { email: data.email });
      const user = await this.authService.register(data);
      res.status(HttpStatus.CREATED).json({
        success: true,
        message: SuccessMessages.OTP_SENT,
        data: user,
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg === ErrorMessages.EMAIL_EXISTS || msg === ErrorMessages.PHONE_EXISTS) {
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
        maxAge: env.jwtRefreshMaxAge,
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
            phone: result.phone,
            gender: result.gender,
            profilePic: result.profilePic,
          },
          accessToken: result.accessToken,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp, userData, purpose } = req.body;
      const result = await this.authService.verifyOtp(email, otp, userData, purpose);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.jwtRefreshMaxAge,
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
            phone: result.phone,
            gender: result.gender,
            profilePic: result.profilePic,
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
      await this.authService.forgotPassword(email);
      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.PASSWORD_RESET_OTP_SENT,
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg === ErrorMessages.USER_NOT_FOUND) {
        return next(new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND));
      }
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body;
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
      if (!userId) {
        return next(new AppError(ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
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

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return next(new AppError(ErrorMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED));
      }
      const result = await this.authService.refreshAccessToken(refreshToken);
      res.status(HttpStatus.OK).json({
        success: true,
        data: { accessToken: result.accessToken },
      });
    } catch (error: unknown) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      res.status(HttpStatus.OK).json({
        success: true,
        message: SuccessMessages.LOGOUT,
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}
