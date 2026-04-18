import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const chatController = new ChatController();

router.get('/:appointmentId', authMiddleware as any, chatController.getChatHistory);

export default router;
