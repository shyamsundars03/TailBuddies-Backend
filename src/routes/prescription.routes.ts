import { Router, RequestHandler } from 'express';
import { prescriptionController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../enums/user-role.enum';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';

const router = Router();

const doctorOnly: RequestHandler = (req: any, res, next) => {
    if (req.user?.role !== UserRole.DOCTOR) {
        return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
    }
    next();
};

router.use(authMiddleware as unknown as RequestHandler);

// Public routes (authenticated)
router.get('/:id', prescriptionController.getPrescriptionById as RequestHandler);
router.get('/:id/download', prescriptionController.downloadPdf as RequestHandler);
router.get('/appointment/:appointmentId', prescriptionController.getPrescriptionByAppointmentId as RequestHandler);

// Doctor only routes
router.post('/', doctorOnly, prescriptionController.createPrescription as RequestHandler);

export default router;
