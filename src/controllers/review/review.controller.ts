import { Response, NextFunction } from 'express';
import { ReviewService } from '../../services/review.service';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class ReviewController {
    constructor(private reviewService: ReviewService) {}

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    reply = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    updateReply = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    deleteReply = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    getDoctorReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    getOwnerReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    getAllReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    getByAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const review = await this.reviewService.getReviewByAppointment(req.params.appointmentId as string);
            res.status(HttpStatus.OK).json({
                success: true,
                data: review
            });
        } catch (error: any) {
            next(error);
        }
    };

    getByDoctorId = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            next(error);
        }
    };

    recalculateRatings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.reviewService.recalculateAllDoctorRatings();
            res.status(HttpStatus.OK).json(result);
        } catch (error: any) {
            next(error);
        }
    };
}
