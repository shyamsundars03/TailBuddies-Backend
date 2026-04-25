import { INotification } from '../models/notification.model';
import { INotificationRepository } from '../repositories/notification.repository';

export interface INotificationService {
    createNotification(userId: string, title: string, message: string, type?: string, link?: string): Promise<INotification>;
    getNotifications(userId: string, status?: string): Promise<INotification[]>;
    markAsRead(notificationId: string): Promise<boolean>;
    markAllAsRead(userId: string): Promise<boolean>;
}

export class NotificationService implements INotificationService {
    private readonly _notificationRepository: INotificationRepository;

    constructor(notificationRepository: INotificationRepository) {
        this._notificationRepository = notificationRepository;
    }

    async createNotification(userId: string, title: string, message: string, type: any = 'other', link?: string): Promise<INotification> {
        return await this._notificationRepository.create({
            recipientId: userId as any,
            title,
            message,
            type,
            link,
            status: 'unread'
        });
    }

    async getNotifications(userId: string, status?: string): Promise<INotification[]> {
        return await this._notificationRepository.findByUserId(userId, status);
    }

    async markAsRead(notificationId: string): Promise<boolean> {
        const result = await this._notificationRepository.markAsRead(notificationId);
        return !!result;
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        await this._notificationRepository.markAllAsRead(userId);
        return true;
    }
}
