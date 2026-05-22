import { Router } from 'express';
import { appointmentController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { ownerOnly, doctorOnly, adminOnly } from '../middleware/role.middleware';
import { validateRequest, validateQuery } from '../middleware/zod-validation.middleware';
import {
    CreateAppointmentSchema,
    UpdateAppointmentStatusSchema,
    CheckInSchema,
    CancelAppointmentSchema,
    GetAvailableSlotsQuerySchema,
} from '../dto/appointment/appointment.schema';

const router = Router();

router.use(authMiddleware);

// Doctor routes
router.get('/doctor/slots', doctorOnly, appointmentController.getDoctorSlots);
router.get('/doctor/patients', doctorOnly, appointmentController.getPatientsByDoctor);
router.get('/doctor/stats', doctorOnly, appointmentController.getStats);
router.get('/doctor', doctorOnly, appointmentController.getDoctorAppointments);

// Admin routes
router.get('/all', adminOnly, appointmentController.getAll);

// Owner routes
router.get('/', ownerOnly, appointmentController.getOwnerAppointments);
router.get('/owner/stats', ownerOnly, appointmentController.getOwnerStats);
router.post('/', ownerOnly, validateRequest(CreateAppointmentSchema), appointmentController.create);
router.post('/:id/cancel-pending', ownerOnly, appointmentController.cancelPendingAppointment);

// Owner booking
router.get('/slots', ownerOnly, validateQuery(GetAvailableSlotsQuerySchema), appointmentController.getAvailableSlots);

// Shared (authenticated)
router.get('/:id/check-slot', appointmentController.checkSlotAvailability);
router.get('/:id', appointmentController.getById);
router.patch('/:id/status', doctorOnly, validateRequest(UpdateAppointmentStatusSchema), appointmentController.updateStatus);
router.post('/:id/cancel', validateRequest(CancelAppointmentSchema), appointmentController.cancel);
router.post('/:id/check-in', validateRequest(CheckInSchema), appointmentController.checkIn);
router.post('/:id/check-out', validateRequest(CheckInSchema), appointmentController.checkOut);

export default router;
