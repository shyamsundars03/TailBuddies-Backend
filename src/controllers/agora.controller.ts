import { Response, NextFunction } from 'express';
import { AgoraService } from '../services/agora.service';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';

export class AgoraController {
    static getRtcToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { channelName, uid, role } = req.query;

            if (!channelName) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'channelName is required'
                });
            }

            const token = AgoraService.generateRtcToken(
                channelName as string,
                uid as string || 0,
                (role as 'publisher' | 'subscriber') || 'publisher'
            );

            res.status(HttpStatus.OK).json({
                success: true,
                token
            });
        } catch (error) {
            next(error);
        }
    }

    static getRtmToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { userId } = req.query;

            if (!userId) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'userId is required'
                });
            }

            const token = AgoraService.generateRtmToken(userId as string);

            res.status(HttpStatus.OK).json({
                success: true,
                token
            });
        } catch (error) {
            next(error);
        }
    }
}
