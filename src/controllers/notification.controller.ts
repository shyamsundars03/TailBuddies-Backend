import { Response } from 'express';
import { INotificationService } from '../services/notification.service';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';
import { ApiResponse } from '../utils/api-response';
import { UnauthorizedError } from '../errors/app-error';

export class NotificationController {
    private readonly _notificationService: INotificationService;

    constructor(notificationService: INotificationService) {
        this._notificationService = notificationService;
    }

    getUserNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const status = req.query.status as string | undefined;
        const notifications = await this._notificationService.getNotifications(userId, status);
        
        res.status(HttpStatus.OK).json(ApiResponse.success('Notifications fetched', notifications));
    };

    markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { id } = req.params;
        await this._notificationService.markAsRead(String(id));
        res.status(HttpStatus.OK).json(ApiResponse.success('Notification marked as read'));
    };

    markAllRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        await this._notificationService.markAllAsRead(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('All notifications marked as read'));
    };
}
