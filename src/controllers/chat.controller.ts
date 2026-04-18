import { Request, Response } from 'express';
import { ChatMessage } from '../models/chat-message.model';
import { HttpStatus } from '../constants';
import logger from '../logger';

export class ChatController {
    getChatHistory = async (req: Request, res: Response) => {
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
            logger.error('Error fetching chat history:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to fetch chat history'
            });
        }
    };
}
