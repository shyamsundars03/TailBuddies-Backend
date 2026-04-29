import { Response, NextFunction } from 'express';
import { ChatMessage } from '../models/chat-message.model';
import { HttpStatus } from '../constants';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';

export class ChatController {
    getChatHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { appointmentId } = req.params;
            
            if (!appointmentId) {
                return res.status(HttpStatus.BAD_REQUEST).json({ 
                    success: false, 
                    message: 'Appointment ID is required' 
                });
            }

            const messages = await ChatMessage.find({ appointmentId })
                .sort({ timestamp: 1 })
                .lean();

            return res.status(HttpStatus.OK).json({
                success: true,
                data: messages
            });
        } catch (error: any) {
            next(error);
        }
    };
}
