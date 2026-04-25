import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { INotificationService } from '../services/notification.service';
import { HttpStatus } from '../constants';
import logger from '../logger';

export class NotificationController {
    private readonly _notificationService: INotificationService;

    constructor(notificationService: INotificationService) {
        this._notificationService = notificationService;
    }

    getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error fetching notifications', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const success = await this._notificationService.markAsRead(String(id));
            res.status(HttpStatus.OK).json({ success });
        } catch (error: any) {
            logger.error('Error marking notification as read', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            await this._notificationService.markAllAsRead(userId);
            res.status(HttpStatus.OK).json({ success: true });
        } catch (error: any) {
            logger.error('Error marking all notifications as read', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
}
