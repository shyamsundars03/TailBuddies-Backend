import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ReviewService } from '../../services/review.service';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class ReviewController {
    constructor(private reviewService: ReviewService) {}

    create = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const review = await this.reviewService.createReview(userId, req.body);
            res.status(HttpStatus.CREATED).json({
                success: true,
                message: 'Review created successfully',
                data: review
            });
        } catch (error: any) {
            logger.error('Error creating review', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    update = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const review = await this.reviewService.updateReview(userId, req.params.id as string, req.body);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Review updated successfully',
                data: review
            });
        } catch (error: any) {
            logger.error('Error updating review', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    delete = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const role = req.user?.role;
            if (!userId || !role) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            await this.reviewService.deleteReview(userId, role, req.params.id as string);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Review deleted successfully'
            });
        } catch (error: any) {
            logger.error('Error deleting review', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    reply = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const review = await this.reviewService.replyToReview(userId, req.params.id as string, req.body.comment);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Reply added successfully',
                data: review
            });
        } catch (error: any) {
            logger.error('Error replying to review', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    updateReply = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const review = await this.reviewService.updateReply(userId, req.params.id as string, req.body.comment);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Reply updated successfully',
                data: review
            });
        } catch (error: any) {
            logger.error('Error updating reply', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    deleteReply = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const role = req.user?.role;
            if (!userId || !role) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const review = await this.reviewService.deleteReply(userId, role, req.params.id as string);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Reply deleted successfully',
                data: review
            });
        } catch (error: any) {
            logger.error('Error deleting reply', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getDoctorReviews = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 4;
            const search = req.query.search as string;

            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const data = await this.reviewService.getReviewsByDoctorUserId(userId, page, limit, search);
            res.status(HttpStatus.OK).json({
                success: true,
                data: data.reviews,
                total: data.total,
                page,
                limit
            });
        } catch (error: any) {
            logger.error('Error fetching doctor reviews', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getOwnerReviews = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 4;
            const search = req.query.search as string;

            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const data = await this.reviewService.getReviewsByOwner(userId, page, limit, search);
            res.status(HttpStatus.OK).json({
                success: true,
                data: data.reviews,
                total: data.total,
                page,
                limit
            });
        } catch (error: any) {
            logger.error('Error fetching owner reviews', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getAllReviews = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 4;
            const search = req.query.search as string;

            const data = await this.reviewService.getAllReviews(page, limit, search);
            res.status(HttpStatus.OK).json({
                success: true,
                data: data.reviews,
                total: data.total,
                page,
                limit
            });
        } catch (error: any) {
            logger.error('Error fetching all reviews', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getById = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const review = await this.reviewService.getReviewById(req.params.id as string);
            if (!review) {
                res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Review not found' });
                return;
            }
            res.status(HttpStatus.OK).json({
                success: true,
                data: review
            });
        } catch (error: any) {
            logger.error('Error fetching review by ID', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getByAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const review = await this.reviewService.getReviewByAppointment(req.params.appointmentId as string);
            res.status(HttpStatus.OK).json({
                success: true,
                data: review
            });
        } catch (error: any) {
            logger.error('Error fetching review by appointment', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    getByDoctorId = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const doctorId = req.params.doctorId as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const data = await this.reviewService.getReviewsByDoctor(doctorId, page, limit, search);
            res.status(HttpStatus.OK).json({
                success: true,
                data: data.reviews,
                total: data.total,
                page,
                limit
            });
        } catch (error: any) {
            logger.error('Error fetching reviews by doctor ID', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    recalculateRatings = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const result = await this.reviewService.recalculateAllDoctorRatings();
            res.status(HttpStatus.OK).json(result);
        } catch (error: any) {
            logger.error('Error in recalculateRatings controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
}
