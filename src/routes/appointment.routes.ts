import { Router } from 'express';
import { appointmentController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';

import logger from '../logger';

const router = Router();
logger.info('Appointment Routes Loading...');

// Admin routes
router.get('/all', authMiddleware, appointmentController.getAll);

// Owner routes
router.get('/', authMiddleware, appointmentController.getOwnerAppointments);

// Doctor routes
router.get('/doctor', authMiddleware, appointmentController.getDoctorAppointments);
router.get('/doctor/patients', authMiddleware, appointmentController.getPatientsByDoctor);

// Single Appointment
router.get('/slots', authMiddleware, appointmentController.getAvailableSlots);
router.get('/:id', authMiddleware, appointmentController.getById);

// Booking
router.post('/', authMiddleware, appointmentController.create);

// Management
router.patch('/:id/status', authMiddleware, appointmentController.updateStatus);
router.post('/:id/cancel', authMiddleware, appointmentController.cancel);

// Check-in/out
// router.post('/:id/check-in', authMiddleware, appointmentController.checkIn);
// router.post('/:id/check-out', authMiddleware, appointmentController.checkOut);

export default router;
