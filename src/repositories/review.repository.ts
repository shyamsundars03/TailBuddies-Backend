import { FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepository } from './base/base.repository';
import { IReview, Review } from '../models/review.model';
import { IReviewRepository } from './interfaces/IReviewRepository';

export class ReviewRepository extends BaseRepository<IReview> implements IReviewRepository {
    constructor() {
        super(Review);
    }

    async findAllWithPopulate(filter: FilterQuery<IReview>, options: QueryOptions = {}): Promise<IReview[]> {
        return await this._model
            .find(filter, null, options)
            .populate('appointmentId')
            .populate({
                path: 'ownerId',
                select: 'username email profilePic'
            })
            .populate({
                path: 'doctorId',
                populate: {
                    path: 'userId',
                    select: 'username email profilePic'
                }
            })
            .sort({ createdAt: -1 });
    }

    async findByAppointmentId(appointmentId: string): Promise<IReview | null> {
        return await this._model
            .findOne({ appointmentId })
            .populate('appointmentId')
            .populate({
                path: 'ownerId',
                select: 'username email profilePic'
            })
            .populate({
                path: 'doctorId',
                populate: {
                    path: 'userId',
                    select: 'username email profilePic'
                }
            });
    }

    async findByDoctorId(doctorId: string): Promise<IReview[]> {
        return await this._model
            .find({ doctorId })
            .populate('appointmentId')
            .populate({
                path: 'ownerId',
                select: 'username email profilePic'
            })
            .sort({ createdAt: -1 });
    }

    async findByOwnerId(ownerId: string): Promise<IReview[]> {
        return await this._model
            .find({ ownerId })
            .populate('appointmentId')
            .populate({
                path: 'doctorId',
                populate: {
                    path: 'userId',
                    select: 'username email profilePic'
                }
            })
            .sort({ createdAt: -1 });
    }

    async findByIdWithPopulate(id: string): Promise<IReview | null> {
        return await this._model
            .findById(id)
            .populate('appointmentId')
            .populate({
                path: 'ownerId',
                select: 'username email profilePic'
            })
            .populate({
                path: 'doctorId',
                populate: {
                    path: 'userId',
                    select: 'username email profilePic'
                }
            });
    }

    async findWithPagination(filter: FilterQuery<IReview>, page: number, limit: number): Promise<{ reviews: IReview[], total: number }> {
        const skip = (page - 1) * limit;
        const [reviews, total] = await Promise.all([
            this._model.find(filter)
                .populate('appointmentId')
                .populate({
                    path: 'ownerId',
                    select: 'username email profilePic'
                })
                .populate({
                    path: 'doctorId',
                    populate: {
                        path: 'userId',
                        select: 'username email profilePic'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments(filter)
        ]);

        return { reviews, total };
    }
}
