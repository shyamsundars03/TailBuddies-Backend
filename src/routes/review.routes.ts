import { Router } from 'express';
import { reviewController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

// Special Specific Routes (MUST BE FIRST)
router.get('/all', authMiddleware, authorizeRoles('admin'), reviewController.getAllReviews);
router.post('/recalculate-ratings', authMiddleware, authorizeRoles('admin'), reviewController.recalculateRatings);
router.get('/owner/me', authMiddleware, authorizeRoles('owner'), reviewController.getOwnerReviews);
router.get('/doctor/me', authMiddleware, authorizeRoles('doctor'), reviewController.getDoctorReviews);

// Parameterized Routes
router.get('/doctor/:doctorId', reviewController.getByDoctorId);
router.get('/appointment/:appointmentId', authMiddleware, reviewController.getByAppointment);
router.get('/:id', authMiddleware, reviewController.getById);

// Action Routes
router.post('/', authMiddleware, authorizeRoles('owner'), reviewController.create);
router.patch('/:id', authMiddleware, authorizeRoles('owner'), reviewController.update);
router.delete('/:id', authMiddleware, authorizeRoles('owner', 'admin'), reviewController.delete);

// Doctor Response Routes
router.post('/:id/reply', authMiddleware, authorizeRoles('doctor'), reviewController.reply);
router.patch('/:id/reply', authMiddleware, authorizeRoles('doctor'), reviewController.updateReply);
router.delete('/:id/reply', authMiddleware, authorizeRoles('doctor', 'admin'), reviewController.deleteReply);

export default router;
