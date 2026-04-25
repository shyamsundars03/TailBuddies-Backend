import { Router } from 'express';
import { AgoraController } from '../controllers/agora.controller';

const router = Router();

router.get('/rtc-token', AgoraController.getRtcToken);
router.get('/rtm-token', AgoraController.getRtmToken);

export default router;
