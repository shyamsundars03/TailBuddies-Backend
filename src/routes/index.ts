import { Router } from 'express';
import aiRoutes from './ai.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use('/ai', aiRoutes);
router.use('/reviews', reviewRoutes);

export default router;