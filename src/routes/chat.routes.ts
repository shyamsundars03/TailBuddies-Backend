import { Router, RequestHandler } from 'express';
import { chatController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get(
    '/:appointmentId',
    authMiddleware as unknown as RequestHandler,
    chatController.getChatHistory
);

export default router;
