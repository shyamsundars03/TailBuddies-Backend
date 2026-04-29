import { Response, NextFunction } from 'express';
import { IUserService } from '../../services/interfaces/IUserService';
import { HttpStatus, SuccessMessages } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class UserController {

    private readonly _userService: IUserService;

    constructor(userService: IUserService) {
        this._userService = userService;
    }

    getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const user = await this._userService.getUserProfile(userId);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.FETCH_SUCCESS,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const user = await this._userService.updateUserProfile(userId, req.body);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.USER_UPDATED,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfilePic = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { profilePic } = req.body;

            if (!profilePic) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "No image provided"
                });
                return;
            }

            const user = await this._userService.updateProfilePic(userId, profilePic);

            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.USER_UPDATED,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    initiateEmailChange = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            await this._userService.initiateEmailChange(userId);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.OTP_SENT
            });
        } catch (error) {
            next(error);
        }
    };

    verifyCurrentEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { otp } = req.body;
            await this._userService.verifyCurrentEmail(userId, otp);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.EMAIL_VERIFIED
            });
        } catch (error) {
            next(error);
        }
    };

    sendOtpToNewEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { newEmail } = req.body;
            await this._userService.sendOtpToNewEmail(userId, newEmail);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.OTP_SENT
            });
        } catch (error) {
            next(error);
        }
    };

    verifyNewEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { newEmail, otp } = req.body;
            const user = await this._userService.verifyNewEmail(userId, newEmail, otp);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.USER_UPDATED,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };
}
