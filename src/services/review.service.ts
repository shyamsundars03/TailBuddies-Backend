import mongoose, { FilterQuery } from 'mongoose';
import { IReviewRepository } from '../repositories/interfaces/IReviewRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IReview } from '../models/review.model';
import { IAppointment } from '../models/appointment.model';
import { IDoctor } from '../models/doctor.model';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error';
import logger from '../logger';
import { ReviewInput, UpdateReviewInput } from '../dto/review/review.schema';
import { IReviewService, ReviewListResult } from './interfaces/IReviewService';

export class ReviewService implements IReviewService {
    constructor(
        private readonly _reviewRepository: IReviewRepository,
        private readonly _appointmentRepository: IAppointmentRepository,
        private readonly _doctorRepository: IDoctorRepository,
        private readonly _userRepository: IUserRepository
    ) {}

    private countWords(str: string): number {
        return str.trim().split(/\s+/).filter((word) => word.length > 0).length;
    }

    private resolveOwnerId(appointment: IAppointment): string {
        const owner = appointment.ownerId as mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId };
        if (owner && typeof owner === 'object' && '_id' in owner) {
            return owner._id.toString();
        }
        return (owner as mongoose.Types.ObjectId).toString();
    }

    private resolveDoctorId(appointment: IAppointment): string {
        const doctor = appointment.doctorId as mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId };
        if (doctor && typeof doctor === 'object' && '_id' in doctor) {
            return doctor._id.toString();
        }
        return (doctor as mongoose.Types.ObjectId).toString();
    }

    private async findUserIdsBySearch(search: string): Promise<mongoose.Types.ObjectId[]> {
        const { users } = await this._userRepository.findWithFilters(1, 500, undefined, search);
        return users.map((u) => u._id as mongoose.Types.ObjectId);
    }

    private async findDoctorIdsByUserSearch(search: string): Promise<mongoose.Types.ObjectId[]> {
        const userIds = await this.findUserIdsBySearch(search);
        if (userIds.length === 0) return [];
        const doctors = await this._doctorRepository.findAll({ userId: { $in: userIds } });
        return doctors.map((d) => d._id as mongoose.Types.ObjectId);
    }

    async createReview(ownerId: string, data: ReviewInput): Promise<IReview> {
        const { appointmentId, rating, comment } = data;

        const appointment = await this._appointmentRepository.findById(appointmentId);
        if (!appointment) {
            throw new NotFoundError('Appointment not found');
        }

        if (this.resolveOwnerId(appointment) !== ownerId) {
            throw new ForbiddenError('You are not authorized to review this appointment');
        }

        if (appointment.status !== 'completed') {
            throw new ValidationError('You can only review completed appointments');
        }

        const existingReview = await this._reviewRepository.findByAppointmentId(appointmentId);
        if (existingReview) {
            throw new ValidationError('You have already reviewed this appointment');
        }

        if (comment && this.countWords(comment) > 100) {
            throw new ValidationError('Comment cannot exceed 100 words');
        }

        const doctorId = this.resolveDoctorId(appointment);

        const review = await this._reviewRepository.create({
            appointmentId: new mongoose.Types.ObjectId(appointmentId),
            ownerId: new mongoose.Types.ObjectId(ownerId),
            doctorId: new mongoose.Types.ObjectId(doctorId),
            rating,
            comment,
        } as unknown as Partial<IReview>);

        await this.updateDoctorRating(doctorId);

        return (await this._reviewRepository.findByIdWithPopulate(review._id.toString())) as IReview;
    }

    async updateReview(ownerId: string, reviewId: string, data: Partial<UpdateReviewInput>): Promise<IReview | null> {
        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundError('Review not found');
        }

        if (review.ownerId.toString() !== ownerId) {
            throw new ForbiddenError('You are not authorized to update this review');
        }

        if (data.comment && this.countWords(data.comment) > 100) {
            throw new ValidationError('Comment cannot exceed 100 words');
        }

        const updateData: Record<string, unknown> = { ...data };
        if (data.appointmentId) {
            updateData.appointmentId = new mongoose.Types.ObjectId(data.appointmentId);
        }

        await this._reviewRepository.update(reviewId, updateData as unknown as Partial<IReview>);

        if (data.rating) {
            await this.updateDoctorRating(review.doctorId.toString());
        }

        return await this._reviewRepository.findByIdWithPopulate(reviewId);
    }

    async deleteReview(userId: string, role: string, reviewId: string): Promise<boolean> {
        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundError('Review not found');
        }

        if (role !== 'admin' && review.ownerId.toString() !== userId) {
            throw new ForbiddenError('You are not authorized to delete this review');
        }

        const doctorId = review.doctorId.toString();
        const deleted = await this._reviewRepository.delete(reviewId);
        if (deleted) {
            await this.updateDoctorRating(doctorId);
        }
        return deleted;
    }

    async replyToReview(userId: string, reviewId: string, comment: string): Promise<IReview | null> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new NotFoundError('Doctor profile not found');
        }

        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundError('Review not found');
        }

        if (review.doctorId.toString() !== doctor._id.toString()) {
            throw new ForbiddenError('You are not authorized to reply to this review');
        }

        if (review.isReplied) {
            throw new ValidationError('You have already replied to this review');
        }

        if (this.countWords(comment) > 100) {
            throw new ValidationError('Reply cannot exceed 100 words');
        }

        await this._reviewRepository.update(reviewId, {
            isReplied: true,
            reply: {
                comment,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        } as unknown as Partial<IReview>);

        return await this._reviewRepository.findByIdWithPopulate(reviewId);
    }

    async updateReply(userId: string, reviewId: string, comment: string): Promise<IReview | null> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new NotFoundError('Doctor profile not found');
        }

        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundError('Review not found');
        }

        if (review.doctorId.toString() !== doctor._id.toString()) {
            throw new ForbiddenError('You are not authorized to update this reply');
        }

        if (!review.isReplied) {
            throw new ValidationError('No reply found to update');
        }

        if (this.countWords(comment) > 100) {
            throw new ValidationError('Reply cannot exceed 100 words');
        }

        await this._reviewRepository.update(reviewId, {
            'reply.comment': comment,
            'reply.updatedAt': new Date(),
        } as unknown as Partial<IReview>);

        return await this._reviewRepository.findByIdWithPopulate(reviewId);
    }

    async deleteReply(userId: string, role: string, reviewId: string): Promise<IReview | null> {
        const review = await this._reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundError('Review not found');
        }

        if (role !== 'admin') {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor || review.doctorId.toString() !== doctor._id.toString()) {
                throw new ForbiddenError('You are not authorized to delete this reply');
            }
        }

        if (!review.isReplied) {
            throw new ValidationError('No reply found to delete');
        }

        return await this._reviewRepository.update(reviewId, {
            isReplied: false,
            $unset: { reply: 1 },
        } as unknown as Partial<IReview>);
    }

    async getReviewsByDoctor(doctorId: string, page: number = 1, limit: number = 4, search?: string): Promise<ReviewListResult> {
        const query: FilterQuery<IReview> = { doctorId: new mongoose.Types.ObjectId(doctorId) };
        if (search) {
            const ownerIds = await this.findUserIdsBySearch(search);
            query.ownerId = { $in: ownerIds };
        }
        const { items: reviews, total } = await this._reviewRepository.findWithPagination(query, page, limit);
        return { reviews, total };
    }

    async getReviewsByDoctorUserId(userId: string, page: number = 1, limit: number = 4, search?: string): Promise<ReviewListResult> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new NotFoundError('Doctor profile not found');
        }
        return await this.getReviewsByDoctor(doctor._id.toString(), page, limit, search);
    }

    async getReviewsByOwner(ownerId: string, page: number = 1, limit: number = 4, search?: string): Promise<ReviewListResult> {
        const query: FilterQuery<IReview> = { ownerId: new mongoose.Types.ObjectId(ownerId) };
        if (search) {
            const doctorIds = await this.findDoctorIdsByUserSearch(search);
            query.doctorId = { $in: doctorIds };
        }
        const { items: reviews, total } = await this._reviewRepository.findWithPagination(query, page, limit);
        return { reviews, total };
    }

    async getAllReviews(page: number = 1, limit: number = 4, search?: string): Promise<ReviewListResult> {
        const query: FilterQuery<IReview> = {};
        if (search) {
            const userIds = await this.findUserIdsBySearch(search);
            const doctorIds = await this.findDoctorIdsByUserSearch(search);
            query.$or = [
                { ownerId: { $in: userIds } },
                { doctorId: { $in: doctorIds } },
            ];
        }
        const { items: reviews, total } = await this._reviewRepository.findWithPagination(query, page, limit);
        return { reviews, total };
    }

    async recalculateAllDoctorRatings(): Promise<{ message: string }> {
        const doctors = await this._doctorRepository.findAll();
        for (const doctor of doctors) {
            await this.updateDoctorRating((doctor as IDoctor)._id.toString());
        }
        return { message: `Recalculated ratings for ${doctors.length} doctors` };
    }

    async getReviewById(reviewId: string): Promise<IReview | null> {
        const review = await this._reviewRepository.findByIdWithPopulate(reviewId);
        if (review) {
            logger.info('Review Fetch Population Check', {
                reviewId,
                hasAppointment: !!review.appointmentId,
                hasOwner: !!review.ownerId,
                hasDoctor: !!review.doctorId,
            });
        }
        return review;
    }

    async getReviewByAppointment(appointmentId: string): Promise<IReview | null> {
        return await this._reviewRepository.findByAppointmentId(appointmentId);
    }

    private async updateDoctorRating(doctorId: string): Promise<void> {
        try {
            logger.info(`Recalculating rating for doctor: ${doctorId}`);

            const docIdObj = new mongoose.Types.ObjectId(doctorId);
            const reviews = await this._reviewRepository.findAll({ doctorId: docIdObj });

            const count = reviews.length;
            const average = count > 0
                ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / count
                : 0;

            const finalRating = Math.floor(average);

            await this._doctorRepository.update(doctorId, {
                averageRating: finalRating,
                reviewCount: count,
            } as unknown as Partial<IDoctor>);

            logger.info(`Updated doctor ${doctorId}: Rating=${finalRating}, Reviews=${count}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Error updating doctor rating for ${doctorId}: ${message}`);
        }
    }
}
