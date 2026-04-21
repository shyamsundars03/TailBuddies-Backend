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
}
