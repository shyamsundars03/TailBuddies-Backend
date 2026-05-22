import { Router, RequestHandler } from 'express';
import { aiAssistantController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { ownerOnly } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/zod-validation.middleware';
import { AnalyzeIssueSchema } from '../dto/ai/ai.schema';

const router = Router();

router.post(
    '/analyze',
    authMiddleware as unknown as RequestHandler,
    ownerOnly as unknown as RequestHandler,
    validateRequest(AnalyzeIssueSchema),
    aiAssistantController.analyze
);

export default router;
