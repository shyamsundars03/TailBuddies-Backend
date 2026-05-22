import { Router, RequestHandler } from 'express';
import { reviewController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeRoles, adminOnly, ownerOnly, doctorOnly } from '../middleware/role.middleware';
import { validateRequest, validateQuery } from '../middleware/zod-validation.middleware';
import {
    CreateReviewSchema,
    UpdateReviewSchema,
    ReplySchema,
    ReviewPaginationQuerySchema,
} from '../dto/review/review.schema';

const router = Router();

// Admin routes (must be first)
router.get('/all', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, validateQuery(ReviewPaginationQuerySchema), reviewController.getAllReviews);
router.post('/recalculate-ratings', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, reviewController.recalculateRatings);

// Role-specific list routes
router.get('/owner/me', authMiddleware as unknown as RequestHandler, ownerOnly as unknown as RequestHandler, validateQuery(ReviewPaginationQuerySchema), reviewController.getOwnerReviews);
router.get('/doctor/me', authMiddleware as unknown as RequestHandler, doctorOnly as unknown as RequestHandler, validateQuery(ReviewPaginationQuerySchema), reviewController.getDoctorReviews);

// Public / parameterized routes
/** Public: owner browse reviews before booking (no auth). */
router.get('/doctor/:doctorId', validateQuery(ReviewPaginationQuerySchema), reviewController.getByDoctorId);
router.get('/appointment/:appointmentId', authMiddleware as unknown as RequestHandler, reviewController.getByAppointment);
router.get('/:id', authMiddleware as unknown as RequestHandler, reviewController.getById);

// Owner actions
router.post('/', authMiddleware as unknown as RequestHandler, ownerOnly as unknown as RequestHandler, validateRequest(CreateReviewSchema), reviewController.create);
router.patch('/:id', authMiddleware as unknown as RequestHandler, ownerOnly as unknown as RequestHandler, validateRequest(UpdateReviewSchema), reviewController.update);
router.delete('/:id', authMiddleware as unknown as RequestHandler, authorizeRoles('owner', 'admin') as unknown as RequestHandler, reviewController.delete);

// Doctor reply actions
router.post('/:id/reply', authMiddleware as unknown as RequestHandler, doctorOnly as unknown as RequestHandler, validateRequest(ReplySchema), reviewController.reply);
router.patch('/:id/reply', authMiddleware as unknown as RequestHandler, doctorOnly as unknown as RequestHandler, validateRequest(ReplySchema), reviewController.updateReply);
router.delete('/:id/reply', authMiddleware as unknown as RequestHandler, authorizeRoles('doctor', 'admin') as unknown as RequestHandler, reviewController.deleteReply);

export default router;
