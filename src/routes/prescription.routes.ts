import { Router, RequestHandler } from 'express';
import { prescriptionController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { doctorOnly } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/zod-validation.middleware';
import { PrescriptionSchema } from '../dto/prescription/prescription.schema';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler);

router.get('/appointment/:appointmentId', prescriptionController.getPrescriptionByAppointmentId);
router.get('/:id/download', prescriptionController.downloadPdf);
router.get('/:id', prescriptionController.getPrescriptionById);

router.post('/', doctorOnly as unknown as RequestHandler, validateRequest(PrescriptionSchema), prescriptionController.createPrescription);

export default router;
