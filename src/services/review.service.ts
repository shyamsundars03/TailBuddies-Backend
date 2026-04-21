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
    ) {}

    private countWords(str: string): number {
        return str.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    async createReview(ownerId: string, data: Partial<IReview>): Promise<IReview> {
        const { appointmentId, rating, comment } = data;

        if (!appointmentId || !rating) {
            throw new AppError('Appointment ID and rating are required', HttpStatus.BAD_REQUEST);
        }

        // Check if appointment exists and belongs to owner
        const appointment = await this.appointmentRepository.findById(appointmentId.toString());
        if (!appointment) {
            throw new AppError('Appointment not found', HttpStatus.NOT_FOUND);
        }

        if (appointment.ownerId.toString() !== ownerId) {
            throw new AppError('You are not authorized to review this appointment', HttpStatus.UNAUTHORIZED);
        }

        // Check status
        if (appointment.status !== 'completed') {
            throw new AppError('You can only review completed appointments', HttpStatus.BAD_REQUEST);
        }

        // Check for duplicate
        const existingReview = await this.reviewRepository.findByAppointmentId(appointmentId.toString());
        if (existingReview) {
            throw new AppError('You have already reviewed this appointment', HttpStatus.BAD_REQUEST);
        }

        // Word count validation
        if (comment && this.countWords(comment) > 100) {
            throw new AppError('Comment cannot exceed 100 words', HttpStatus.BAD_REQUEST);
        }

        const review = await this.reviewRepository.create({
            appointmentId: new mongoose.Types.ObjectId(appointmentId as any),
            ownerId: new mongoose.Types.ObjectId(ownerId),
            doctorId: appointment.doctorId,
            rating,
            comment
        } as any);

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

        return await this.reviewRepository.delete(reviewId);
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

    async getReviewsByDoctor(userId: string): Promise<IReview[]> {
        const doctor = await this.doctorRepository.findByUserId(userId);
        if (!doctor) {
            throw new AppError('Doctor profile not found', HttpStatus.NOT_FOUND);
        }
        return await this.reviewRepository.findByDoctorId(doctor._id.toString());
    }

    async getReviewsByOwner(ownerId: string): Promise<IReview[]> {
        return await this.reviewRepository.findByOwnerId(ownerId);
    }

    async getAllReviews(): Promise<IReview[]> {
        return await this.reviewRepository.findAllWithPopulate({});
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
}
