import mongoose from 'mongoose';
import { ChatMessage, IChatMessage } from '../models/chat-message.model';
import { CreateChatMessageInput, IChatRepository } from './interfaces/IChatRepository';

export class ChatRepository implements IChatRepository {
    async findByAppointmentId(appointmentId: string): Promise<IChatMessage[]> {
        return (await ChatMessage.find({ appointmentId })
            .sort({ timestamp: 1 })
            .lean()) as unknown as IChatMessage[];
    }

    async createMessage(data: CreateChatMessageInput): Promise<IChatMessage> {
        return await ChatMessage.create({
            appointmentId: new mongoose.Types.ObjectId(data.appointmentId),
            senderId: new mongoose.Types.ObjectId(data.senderId),
            senderRole: data.senderRole,
            message: data.message,
            timestamp: data.timestamp,
        });
    }
}
