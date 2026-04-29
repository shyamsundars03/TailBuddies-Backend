import mongoose from 'mongoose';
import { IReviewRepository } from '../repositories/interfaces/IReviewRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IReview } from '../models/review.model';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../constants';
import logger from '../logger';

export class ReviewService {
    constructor(
        private reviewRepository: IReviewRepository,
        private appointmentRepository: IAppointmentRepository,
        private doctorRepository: IDoctorRepository
    ) { }

    private countWords(str: string): number {
        return str.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    async createReview(ownerId: string, data: Partial<IReview>): Promise<IReview> {
        const { appointmentId, rating, comment } = data;

        if (!appointmentId || !rating) {
            throw new AppError('Appointment ID and rating are required', HttpStatus.BAD_REQUEST);
        }


        const appointment = await this.appointmentRepository.findById(appointmentId.toString());
        if (!appointment) {
            throw new AppError('Appointment not found', HttpStatus.NOT_FOUND);
        }

        const ownerIdToCompare = (appointment.ownerId as any)._id ? (appointment.ownerId as any)._id.toString() : appointment.ownerId.toString();
        if (ownerIdToCompare !== ownerId) {
            throw new AppError('You are not authorized to review this appointment', HttpStatus.UNAUTHORIZED);
        }


        if (appointment.status !== 'completed') {
            throw new AppError('You can only review completed appointments', HttpStatus.BAD_REQUEST);
        }


        const existingReview = await this.reviewRepository.findByAppointmentId(appointmentId.toString());
        if (existingReview) {
            throw new AppError('You have already reviewed this appointment', HttpStatus.BAD_REQUEST);
        }


        if (comment && this.countWords(comment) > 100) {
            throw new AppError('Comment cannot exceed 100 words', HttpStatus.BAD_REQUEST);
        }

        const doctorId = (appointment.doctorId as any)._id || appointment.doctorId;

        const review = await this.reviewRepository.create({
            appointmentId: new mongoose.Types.ObjectId(appointmentId as any),
            ownerId: new mongoose.Types.ObjectId(ownerId),
            doctorId: new mongoose.Types.ObjectId(doctorId.toString()),
            rating,
            comment
        } as any);

        await this.updateDoctorRating(doctorId.toString());

        return await this.reviewRepository.findByIdWithPopulate(review._id.toString()) as IReview;
    }

    async updateReview(ownerId: string, reviewId: string, data: Partial<IReview>): Promise<IReview | null> {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new AppError('Review not found', HttpStatus.NOT_FOUND);
        }

        if (review.ownerId.toString() !== ownerId) {
            throw new AppError('You are not authorized to update this review', HttpStatus.UNAUTHORIZED);
        }

        if (data.comment && this.countWords(data.comment) > 100) {
            throw new AppError('Comment cannot exceed 100 words', HttpStatus.BAD_REQUEST);
        }

        await this.reviewRepository.update(reviewId, data);

        if (data.rating) {
            await this.updateDoctorRating(review.doctorId.toString());
        }

        return await this.reviewRepository.findByIdWithPopulate(reviewId);
    }

    async deleteReview(userId: string, role: string, reviewId: string): Promise<boolean> {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new AppError('Review not found', HttpStatus.NOT_FOUND);
        }

        // Owner can delete their own, Admin can delete any
        if (role !== 'admin' && review.ownerId.toString() !== userId) {
            throw new AppError('You are not authorized to delete this review', HttpStatus.UNAUTHORIZED);
        }

        const doctorId = review.doctorId.toString();
        const deleted = await this.reviewRepository.delete(reviewId);
        if (deleted) {
            await this.updateDoctorRating(doctorId);
        }
        return deleted;
    }

    async replyToReview(userId: string, reviewId: string, comment: string): Promise<IReview | null> {
        const doctor = await this.doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new AppError('Doctor profile not found', HttpStatus.NOT_FOUND);
        }

        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new AppError('Review not found', HttpStatus.NOT_FOUND);
        }

        logger.info('Review Reply Authorization Trace', {
            authenticatedUserId: userId,
            resolvedDoctorProfileId: doctor._id.toString(),
            reviewStoredDoctorId: review.doctorId.toString(),
            match: review.doctorId.toString() === doctor._id.toString()
        });

        if (review.doctorId.toString() !== doctor._id.toString()) {
            throw new AppError('You are not authorized to reply to this review', HttpStatus.UNAUTHORIZED);
        }

        if (review.isReplied) {
            throw new AppError('You have already replied to this review', HttpStatus.BAD_REQUEST);
        }

        if (this.countWords(comment) > 100) {
            throw new AppError('Reply cannot exceed 100 words', HttpStatus.BAD_REQUEST);
        }

        await this.reviewRepository.update(reviewId, {
            isReplied: true,
            reply: {
                comment,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        } as any);

        return await this.reviewRepository.findByIdWithPopulate(reviewId);
    }

    async updateReply(userId: string, reviewId: string, comment: string): Promise<IReview | null> {
        const doctor = await this.doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new AppError('Doctor profile not found', HttpStatus.NOT_FOUND);
        }

        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new AppError('Review not found', HttpStatus.NOT_FOUND);
        }

        if (review.doctorId.toString() !== doctor._id.toString()) {
            throw new AppError('You are not authorized to update this reply', HttpStatus.UNAUTHORIZED);
        }

        if (!review.isReplied) {
            throw new AppError('No reply found to update', HttpStatus.BAD_REQUEST);
        }

        if (this.countWords(comment) > 100) {
            throw new AppError('Reply cannot exceed 100 words', HttpStatus.BAD_REQUEST);
        }

        await this.reviewRepository.update(reviewId, {
            'reply.comment': comment,
            'reply.updatedAt': new Date()
        } as any);

        return await this.reviewRepository.findByIdWithPopulate(reviewId);
    }

    async deleteReply(userId: string, role: string, reviewId: string): Promise<IReview | null> {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new AppError('Review not found', HttpStatus.NOT_FOUND);
        }

        // Admin can delete any
        if (role !== 'admin') {
            const doctor = await this.doctorRepository.findByUserId(userId);
            if (!doctor || review.doctorId.toString() !== doctor._id.toString()) {
                throw new AppError('You are not authorized to delete this reply', HttpStatus.UNAUTHORIZED);
            }
        }

        if (!review.isReplied) {
            throw new AppError('No reply found to delete', HttpStatus.BAD_REQUEST);
        }

        return await this.reviewRepository.update(reviewId, {
            isReplied: false,
            $unset: { reply: 1 }
        } as any);
    }

    async getReviewsByDoctor(doctorId: string, page: number = 1, limit: number = 4, search?: string): Promise<{ reviews: IReview[], total: number }> {
        const query: any = { doctorId };
        if (search) {
            const owners = await (this.reviewRepository as any)._model.db.model('User').find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');
            query.ownerId = { $in: owners.map((o: any) => o._id) };
        }
        return await this.reviewRepository.findWithPagination(query, page, limit);
    }

    async getReviewsByDoctorUserId(userId: string, page: number = 1, limit: number = 4, search?: string): Promise<{ reviews: IReview[], total: number }> {
        const doctor = await this.doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new AppError('Doctor profile not found', HttpStatus.NOT_FOUND);
        }
        return await this.getReviewsByDoctor(doctor._id.toString(), page, limit, search);
    }

    async getReviewsByOwner(ownerId: string, page: number = 1, limit: number = 4, search?: string): Promise<{ reviews: IReview[], total: number }> {
        const query: any = { ownerId };
        if (search) {
            const doctorUserIds = await (this.reviewRepository as any)._model.db.model('User').find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');

            const doctors = await (this.doctorRepository as any)._model.find({
                userId: { $in: doctorUserIds.map((u: any) => u._id) }
            }).select('_id');

            query.doctorId = { $in: doctors.map((d: any) => d._id) };
        }
        return await this.reviewRepository.findWithPagination(query, page, limit);
    }

    async getAllReviews(page: number = 1, limit: number = 4, search?: string): Promise<{ reviews: IReview[], total: number }> {
        const query: any = {};
        if (search) {
            const users = await (this.reviewRepository as any)._model.db.model('User').find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');

            const doctors = await (this.doctorRepository as any)._model.find({
                userId: { $in: users.map((u: any) => u._id) }
            }).select('_id');

            query.$or = [
                { ownerId: { $in: users.map((u: any) => u._id) } },
                { doctorId: { $in: doctors.map((d: any) => d._id) } }
            ];
        }
        return await this.reviewRepository.findWithPagination(query, page, limit);
    }

    async recalculateAllDoctorRatings(): Promise<{ success: boolean; message: string }> {
        try {
            const doctors = await (this.doctorRepository as any)._model.find({});
            for (const doctor of doctors) {
                await this.updateDoctorRating(doctor._id.toString());
            }
            return { success: true, message: `Recalculated ratings for ${doctors.length} doctors` };
        } catch (error: any) {
            logger.error('Error recalculating all ratings', { error: error.message });
            return { success: false, message: error.message };
        }
    }

    async getReviewById(reviewId: string): Promise<IReview | null> {
        const review = await this.reviewRepository.findByIdWithPopulate(reviewId);
        if (review) {
            logger.info('Review Fetch Population Check', {
                reviewId,
                hasAppointment: !!review.appointmentId,
                hasOwner: !!review.ownerId,
                hasDoctor: !!review.doctorId,
                doctorHasUser: !!(review.doctorId as any)?.userId
            });
        }
        return review;
    }

    async getReviewByAppointment(appointmentId: string): Promise<IReview | null> {
        return await this.reviewRepository.findByAppointmentId(appointmentId);
    }

    private async updateDoctorRating(doctorId: string): Promise<void> {
        try {
            logger.info(`Recalculating rating for doctor: ${doctorId}`);

            const docIdObj = new mongoose.Types.ObjectId(doctorId);
            const reviews = await this.reviewRepository.model.find({ doctorId: docIdObj });

            const count = reviews.length;
            const average = count > 0
                ? reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / count
                : 0;

            const finalRating = Math.floor(average);

            await this.doctorRepository.update(doctorId, {
                averageRating: finalRating,
                reviewCount: count
            } as any);

            logger.info(`Updated doctor ${doctorId}: Rating=${finalRating}, Reviews=${count}`);
        } catch (error: any) {
            logger.error(`Error updating doctor rating for ${doctorId}: ${error.message}`);
        }
    }
}
