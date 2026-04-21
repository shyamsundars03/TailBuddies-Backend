import { Router } from 'express';
import { reviewController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

// General Routes
router.get('/all', authMiddleware, authorizeRoles('admin'), reviewController.getAllReviews);
router.get('/:id', authMiddleware, reviewController.getById);
router.get('/appointment/:appointmentId', authMiddleware, reviewController.getByAppointment);

// Owner Routes
router.post('/', authMiddleware, authorizeRoles('owner'), reviewController.create);
router.get('/owner/me', authMiddleware, authorizeRoles('owner'), reviewController.getOwnerReviews);
router.patch('/:id', authMiddleware, authorizeRoles('owner'), reviewController.update);
router.delete('/:id', authMiddleware, authorizeRoles('owner', 'admin'), reviewController.delete);

// Doctor Routes
router.get('/doctor/me', authMiddleware, authorizeRoles('doctor'), reviewController.getDoctorReviews);
router.post('/:id/reply', authMiddleware, authorizeRoles('doctor'), reviewController.reply);
router.patch('/:id/reply', authMiddleware, authorizeRoles('doctor'), reviewController.updateReply);
router.delete('/:id/reply', authMiddleware, authorizeRoles('doctor', 'admin'), reviewController.deleteReply);

export default router;
