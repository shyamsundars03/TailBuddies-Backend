import { IChatMessage } from '../../models/chat-message.model';

export interface SendChatMessageInput {
    appointmentId: string;
    senderId: string;
    senderRole: 'owner' | 'doctor';
    message: string;
}

export interface IChatService {
    getChatHistory(appointmentId: string, userId: string, role: string): Promise<IChatMessage[]>;
    sendMessage(userId: string, role: string, data: SendChatMessageInput): Promise<IChatMessage>;
}
