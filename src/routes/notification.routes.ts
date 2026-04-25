import { Router, RequestHandler } from 'express';
import { notificationController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler);

router.get('/', notificationController.getUserNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllRead);

export default router;
