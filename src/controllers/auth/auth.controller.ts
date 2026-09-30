import { Request, Response } from 'express';
import { IAuthService } from '../../services/interfaces/IAuthService';
import { HttpStatus, SuccessMessages } from '../../constants';
import { ApiResponse } from '../../utils/api-response';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../../utils/cookie.util';

export class AuthController {
  private readonly _authService: IAuthService;

  constructor(authService: IAuthService) {
    this._authService = authService;
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this._authService.login(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.LOGIN, {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        phone: result.phone,
        gender: result.gender,
        profilePic: result.profilePic,
      },
      accessToken: result.accessToken,
    }));
  };

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this._authService.register(req.body);
    res.status(HttpStatus.CREATED).json(ApiResponse.success(SuccessMessages.OTP_SENT, user));
  };

  googleLogin = async (req: Request, res: Response): Promise<void> => {
    const result = await this._authService.googleLogin(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.LOGIN, {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        phone: result.phone,
        gender: result.gender,
        profilePic: result.profilePic,
      },
      accessToken: result.accessToken,
    }));
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const result = await this._authService.verifyOtp(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.OTP_VERIFIED, {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        phone: result.phone,
        gender: result.gender,
        profilePic: result.profilePic,
      },
      accessToken: result.accessToken,
    }));
  };

  resendOtp = async (req: Request, res: Response): Promise<void> => {
    await this._authService.resendOtp(req.body);
    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.OTP_SENT));
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this._authService.forgotPassword(req.body);
    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.PASSWORD_RESET_OTP_SENT));
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this._authService.resetPassword(req.body);
    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.PASSWORD_RESET));
  };

  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    
    await this._authService.changePassword(userId, req.body);
    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.PASSWORD_CHANGED));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken;
    const result = await this._authService.refreshAccessToken(refreshToken);
    res.status(HttpStatus.OK).json(ApiResponse.success('Token refreshed', { accessToken: result.accessToken }));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    clearRefreshTokenCookie(res);
    res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.LOGOUT));
  };
}
