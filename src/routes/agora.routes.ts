import { Router, RequestHandler } from 'express';
import { AgoraController } from '../controllers/agora.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler);

router.get('/rtc-token', AgoraController.getRtcToken);
router.get('/rtm-token', AgoraController.getRtmToken);

export default router;
