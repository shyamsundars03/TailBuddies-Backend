import { Request, Response } from 'express';
import { AgoraService } from '../services/agora.service';
import { HttpStatus } from '../constants';
import logger from '../logger';

export class AgoraController {
    static getRtcToken(req: Request, res: Response) {
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
            logger.error('AgoraController error:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to generate token'
            });
        }
    }

    static getRtmToken(req: Request, res: Response) {
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
            logger.error('AgoraController error:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to generate RTM token'
            });
        }
    }
}
