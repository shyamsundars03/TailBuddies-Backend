import { Response } from 'express';
import { AgoraService } from '../services/agora.service';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';
import { ApiResponse } from '../utils/api-response';
import { ValidationError } from '../errors/app-error';

export class AgoraController {
    static getRtcToken(req: AuthenticatedRequest, res: Response): void {
        const { channelName, uid, role } = req.query;

        if (!channelName) throw new ValidationError('channelName is required');

        const token = AgoraService.generateRtcToken(
            channelName as string,
            uid as string || 0,
            (role as 'publisher' | 'subscriber') || 'publisher'
        );

        res.status(HttpStatus.OK).json(ApiResponse.success('RTC token generated', { token }));
    }

    static getRtmToken(req: AuthenticatedRequest, res: Response): void {
        const { userId } = req.query;

        if (!userId) throw new ValidationError('userId is required');

        const token = AgoraService.generateRtmToken(userId as string);

        res.status(HttpStatus.OK).json(ApiResponse.success('RTM token generated', { token }));
    }
}
