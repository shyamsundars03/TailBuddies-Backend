import { Router, Response, NextFunction, RequestHandler } from 'express';
import { slotController } from '../config/di';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../enums/user-role.enum';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';

const router = Router();

const doctorOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.DOCTOR) {
        return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
    }
    next();
};

router.use(authMiddleware as unknown as RequestHandler);
router.use(doctorOnly as unknown as RequestHandler);

router.post('/block', slotController.blockSlots);
router.post('/unblock', slotController.unblockSlots);

export default router;
