import { Response, NextFunction } from 'express';
import { INotificationService } from '../services/notification.service';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';

export class NotificationController {
    private readonly _notificationService: INotificationService;

    constructor(notificationService: INotificationService) {
        this._notificationService = notificationService;
    }

    getUserNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const status = req.query.status as string; // 'unread' or undefined (for all)
            const notifications = await this._notificationService.getNotifications(userId, status);
            
            res.status(HttpStatus.OK).json({ success: true, notifications });
        } catch (error: any) {
            next(error);
        }
    };

    markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const success = await this._notificationService.markAsRead(String(id));
            res.status(HttpStatus.OK).json({ success });
        } catch (error: any) {
            next(error);
        }
    };

    markAllRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            await this._notificationService.markAllAsRead(userId);
            res.status(HttpStatus.OK).json({ success: true });
        } catch (error: any) {
            next(error);
        }
    };
}
