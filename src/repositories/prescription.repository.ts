import { BaseRepository } from './base/base.repository';
import { IPrescription, Prescription } from '../models/prescription.model';
import { IPrescriptionRepository } from './interfaces/IPrescriptionRepository';

export class PrescriptionRepository extends BaseRepository<IPrescription> implements IPrescriptionRepository {
    constructor() {
        super(Prescription);
    }

    async findByAppointmentId(appointmentId: string): Promise<IPrescription | null> {
        return await this._model.findOne({ appointmentId })
            .populate({
                path: 'vetId',
                populate: { path: 'userId' }
            })
            .populate('petId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findById(id: string): Promise<IPrescription | null> {
        return await this._model.findById(id)
            .populate({
                path: 'vetId',
                populate: { path: 'userId' }
            })
            .populate('petId')
            .exec();
    }
}
