import { INotification, Notification } from '../models/notification.model';
import mongoose from 'mongoose';

export interface INotificationRepository {
    create(data: Partial<INotification>): Promise<INotification>;
    findByUserId(userId: string, status?: string): Promise<INotification[]>;
    markAsRead(id: string): Promise<INotification | null>;
    markAllAsRead(userId: string): Promise<void>;
    deleteOld(days: number): Promise<void>;
}

export class NotificationRepository implements INotificationRepository {
    async create(data: Partial<INotification>): Promise<INotification> {
        const notification = new Notification(data);
        return await notification.save();
    }

    async findByUserId(userId: string, status?: string): Promise<INotification[]> {
        const query: any = { recipientId: new mongoose.Types.ObjectId(userId) };
        if (status) query.status = status;
        return await Notification.find(query).sort({ createdAt: -1 });
    }

    async markAsRead(id: string): Promise<INotification | null> {
        return await Notification.findByIdAndUpdate(id, { status: 'read' }, { new: true });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await Notification.updateMany(
            { recipientId: new mongoose.Types.ObjectId(userId), status: 'unread' },
            { status: 'read' }
        );
    }

    async deleteOld(days: number): Promise<void> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        await Notification.deleteMany({ createdAt: { $lt: cutoff } });
    }
}
