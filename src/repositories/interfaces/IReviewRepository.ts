import { FilterQuery, QueryOptions } from 'mongoose';
import { IBaseRepository } from '../base/base.repository.interface';
import { IReview } from '../../models/review.model';

export interface IReviewRepository extends IBaseRepository<IReview> {
    findAllWithPopulate(filter: FilterQuery<IReview>, options?: QueryOptions): Promise<IReview[]>;
    findByAppointmentId(appointmentId: string): Promise<IReview | null>;
    findByDoctorId(doctorId: string): Promise<IReview[]>;
    findByOwnerId(ownerId: string): Promise<IReview[]>;
    findByIdWithPopulate(id: string): Promise<IReview | null>;
}
