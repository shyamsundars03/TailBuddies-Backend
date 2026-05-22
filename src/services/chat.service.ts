import { IChatService, SendChatMessageInput } from './interfaces/IChatService';
import { IChatRepository } from '../repositories/interfaces/IChatRepository';
import { AppointmentAccessService } from './appointment-access.service';
import { IChatMessage } from '../models/chat-message.model';
import { ValidationError } from '../errors/app-error';
import { IAppointment } from '../models/appointment.model';

export class ChatService implements IChatService {
    constructor(
        private readonly _chatRepository: IChatRepository,
        private readonly _appointmentAccessService: AppointmentAccessService
    ) {}

    async getChatHistory(appointmentId: string, userId: string, role: string): Promise<IChatMessage[]> {
        await this._appointmentAccessService.assertAppointmentAccess(appointmentId, userId, role);
        return await this._chatRepository.findByAppointmentId(appointmentId);
    }

    async sendMessage(userId: string, role: string, data: SendChatMessageInput): Promise<IChatMessage> {
        if (String(data.senderId) !== String(userId)) {
            throw new ValidationError('Unauthorized: Sender ID mismatch');
        }

        const appointment = await this._appointmentAccessService.assertAppointmentAccess(
            data.appointmentId,
            userId,
            role
        );

        if (!this.isWithinConsultationWindow(appointment)) {
            throw new ValidationError('Chat is only active during the consultation time window.');
        }

        return await this._chatRepository.createMessage({
            appointmentId: data.appointmentId,
            senderId: userId,
            senderRole: data.senderRole,
            message: data.message,
            timestamp: new Date(),
        });
    }

    private isWithinConsultationWindow(appointment: IAppointment): boolean {
        if (appointment.status === 'ongoing') {
            return true;
        }

        const now = new Date();
        const [startH, startM] = appointment.appointmentStartTime.split(':').map(Number);
        const [endH, endM] = appointment.appointmentEndTime.split(':').map(Number);

        const apptStart = new Date(appointment.appointmentDate);
        apptStart.setHours(startH, startM, 0, 0);

        const apptEnd = new Date(appointment.appointmentDate);
        apptEnd.setHours(endH, endM, 0, 0);

        // Allow chat from 15 minutes before start until 30 minutes after end
        const windowStart = new Date(apptStart.getTime() - 15 * 60 * 1000);
        const windowEnd = new Date(apptEnd.getTime() + 30 * 60 * 1000);

        return now >= windowStart && now <= windowEnd;
    }
}
