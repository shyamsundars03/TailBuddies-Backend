import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipientId: mongoose.Types.ObjectId;
    senderId?: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'appointment' | 'prescription' | 'payment' | 'other';
    status: 'unread' | 'read';
    link?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['appointment', 'prescription', 'payment', 'other'],
        default: 'other' 
    },
    status: { 
        type: String, 
        enum: ['unread', 'read'], 
        default: 'unread' 
    },
    link: { type: String },
}, { timestamps: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
