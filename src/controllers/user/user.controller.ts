import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { IUserService } from '../../services/interfaces/IUserService';
import { HttpStatus, SuccessMessages } from '../../constants';

export class UserController {
    constructor(private readonly userService: IUserService) { }

    getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = await this.userService.getUserProfile(req.user!.userId);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.FETCH_SUCCESS,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = await this.userService.updateUserProfile(req.user!.userId, req.body);
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
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { profilePic } = req.body;

            if (!profilePic) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "No image provided"
                });
                return;
            }

            const user = await this.userService.updateProfilePic(
                req.user!.userId,
                profilePic
            );

            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.USER_UPDATED,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    initiateEmailChange = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.userService.initiateEmailChange(req.user!.userId);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.OTP_SENT
            });
        } catch (error) {
            next(error);
        }
    };

    verifyCurrentEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { otp } = req.body;
            await this.userService.verifyCurrentEmail(req.user!.userId, otp);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.EMAIL_VERIFIED
            });
        } catch (error) {
            next(error);
        }
    };

    sendOtpToNewEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { newEmail } = req.body;
            await this.userService.sendOtpToNewEmail(req.user!.userId, newEmail);
            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.OTP_SENT
            });
        } catch (error) {
            next(error);
        }
    };

    verifyNewEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { newEmail, otp } = req.body;
            const user = await this.userService.verifyNewEmail(req.user!.userId, newEmail, otp);
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
