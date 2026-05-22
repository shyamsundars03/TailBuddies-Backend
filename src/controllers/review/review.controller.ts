import { Response } from 'express';
import { IReviewService } from '../../services/interfaces/IReviewService';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import {
    CreateReviewInput,
    UpdateReviewInput,
    ReplyInput,
} from '../../dto/review/review.schema';
import { UnauthorizedError } from '../../errors/app-error';

export class ReviewController {
    constructor(private readonly _reviewService: IReviewService) {}

    create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const review = await this._reviewService.createReview(userId, req.body as CreateReviewInput);
        res.status(HttpStatus.CREATED).json(ApiResponse.success('Review created successfully', review));
    };

    update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const review = await this._reviewService.updateReview(userId, req.params.id as string, req.body as UpdateReviewInput);
        res.status(HttpStatus.OK).json(ApiResponse.success('Review updated successfully', review));
    };

    delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        await this._reviewService.deleteReview(userId, role, req.params.id as string);
        res.status(HttpStatus.OK).json(ApiResponse.success('Review deleted successfully'));
    };

    reply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { comment } = req.body as ReplyInput;
        const review = await this._reviewService.replyToReview(userId, req.params.id as string, comment);
        res.status(HttpStatus.OK).json(ApiResponse.success('Reply added successfully', review));
    };

    updateReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { comment } = req.body as ReplyInput;
        const review = await this._reviewService.updateReply(userId, req.params.id as string, comment);
        res.status(HttpStatus.OK).json(ApiResponse.success('Reply updated successfully', review));
    };

    deleteReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        const review = await this._reviewService.deleteReply(userId, role, req.params.id as string);
        res.status(HttpStatus.OK).json(ApiResponse.success('Reply deleted successfully', review));
    };

    getDoctorReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 4;
        const search = req.query.search as string | undefined;

        const data = await this._reviewService.getReviewsByDoctorUserId(userId, page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctor reviews fetched', {
            items: data.reviews,
            total: data.total,
            page,
            limit,
        }));
    };

    getOwnerReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 4;
        const search = req.query.search as string | undefined;

        const data = await this._reviewService.getReviewsByOwner(userId, page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('Owner reviews fetched', {
            items: data.reviews,
            total: data.total,
            page,
            limit,
        }));
    };

    getAllReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 4;
        const search = req.query.search as string | undefined;

        const data = await this._reviewService.getAllReviews(page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('All reviews fetched', {
            items: data.reviews,
            total: data.total,
            page,
            limit,
        }));
    };

    getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const review = await this._reviewService.getReviewById(req.params.id as string);
        res.status(HttpStatus.OK).json(ApiResponse.success('Review details fetched', review));
    };

    getByAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const review = await this._reviewService.getReviewByAppointment(req.params.appointmentId as string);
        res.status(HttpStatus.OK).json(ApiResponse.success('Review fetched by appointment', review));
    };

    getByDoctorId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const doctorId = req.params.doctorId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string | undefined;

        const data = await this._reviewService.getReviewsByDoctor(doctorId, page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctor reviews fetched', {
            items: data.reviews,
            total: data.total,
            page,
            limit,
        }));
    };

    recalculateRatings = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
        const result = await this._reviewService.recalculateAllDoctorRatings();
        res.status(HttpStatus.OK).json(ApiResponse.success('Ratings recalculated', result));
    };
}
