import { Response } from 'express';
import { IChatService } from '../services/interfaces/IChatService';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';
import { ApiResponse } from '../utils/api-response';
import { UnauthorizedError, ValidationError } from '../errors/app-error';

export class ChatController {
    constructor(private readonly _chatService: IChatService) {}

    getChatHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        const appointmentId = String(req.params.appointmentId);
        if (!appointmentId) throw new ValidationError('Appointment ID is required');

        const messages = await this._chatService.getChatHistory(appointmentId, userId, role);

        res.status(HttpStatus.OK).json(ApiResponse.success('Chat history fetched', messages));
    };
}
