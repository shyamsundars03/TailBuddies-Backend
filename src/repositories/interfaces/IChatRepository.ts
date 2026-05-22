import { IChatMessage } from '../../models/chat-message.model';

export interface CreateChatMessageInput {
    appointmentId: string;
    senderId: string;
    senderRole: 'owner' | 'doctor';
    message: string;
    timestamp: Date;
}

export interface IChatRepository {
    findByAppointmentId(appointmentId: string): Promise<IChatMessage[]>;
    createMessage(data: CreateChatMessageInput): Promise<IChatMessage>;
}
