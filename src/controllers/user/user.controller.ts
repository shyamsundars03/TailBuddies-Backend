import { Response } from 'express';
import { IUserService } from '../../services/interfaces/IUserService';
import { HttpStatus, SuccessMessages } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { UnauthorizedError } from '../../errors/app-error';
// import { z } from 'zod';

// import { Gender } from '../../enums/gender.enum';

import { UpdateProfileSchema, ProfilePicSchema, OtpSchema, NewEmailSchema, VerifyNewEmailSchema } from '../../dto/user/user.schema';


export class UserController {
    private readonly _userService: IUserService;

    constructor(userService: IUserService) {
        this._userService = userService;
    }

    getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const user = await this._userService.getUserProfile(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.FETCH_SUCCESS, user));
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const validatedData = UpdateProfileSchema.parse(req.body);
        const user = await this._userService.updateUserProfile(userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.USER_UPDATED, user));
    };

    updateProfilePic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const validatedData = ProfilePicSchema.parse(req.body);
        const user = await this._userService.updateProfilePic(userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.USER_UPDATED, user));
    };

    initiateEmailChange = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        await this._userService.initiateEmailChange(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.OTP_SENT));
    };

    verifyCurrentEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const validatedData = OtpSchema.parse(req.body);
        await this._userService.verifyCurrentEmail(userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.EMAIL_VERIFIED));
    };

    sendOtpToNewEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const validatedData = NewEmailSchema.parse(req.body);
        await this._userService.sendOtpToNewEmail(userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.OTP_SENT));
    };

    verifyNewEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const validatedData = VerifyNewEmailSchema.parse(req.body);
        const user = await this._userService.verifyNewEmail(userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.USER_UPDATED, user));
    };
}
