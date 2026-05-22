import { IReview } from '../../models/review.model';
import { ReviewInput } from '../../dto/review/review.schema';

export interface ReviewListResult {
    reviews: IReview[];
    total: number;
}

export interface IReviewService {
    createReview(ownerId: string, data: ReviewInput): Promise<IReview>;
    updateReview(ownerId: string, reviewId: string, data: Partial<ReviewInput>): Promise<IReview | null>;
    deleteReview(userId: string, role: string, reviewId: string): Promise<boolean>;
    replyToReview(userId: string, reviewId: string, comment: string): Promise<IReview | null>;
    updateReply(userId: string, reviewId: string, comment: string): Promise<IReview | null>;
    deleteReply(userId: string, role: string, reviewId: string): Promise<IReview | null>;
    getReviewsByDoctor(doctorId: string, page?: number, limit?: number, search?: string): Promise<ReviewListResult>;
    getReviewsByDoctorUserId(userId: string, page?: number, limit?: number, search?: string): Promise<ReviewListResult>;
    getReviewsByOwner(ownerId: string, page?: number, limit?: number, search?: string): Promise<ReviewListResult>;
    getAllReviews(page?: number, limit?: number, search?: string): Promise<ReviewListResult>;
    recalculateAllDoctorRatings(): Promise<{ message: string }>;
    getReviewById(reviewId: string): Promise<IReview | null>;
    getReviewByAppointment(appointmentId: string): Promise<IReview | null>;
}
