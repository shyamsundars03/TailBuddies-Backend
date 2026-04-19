import { BaseRepository } from './base/base.repository';
import { IPrescription, Prescription } from '../models/prescription.model';
import { IPrescriptionRepository } from './interfaces/IPrescriptionRepository';

export class PrescriptionRepository extends BaseRepository<IPrescription> implements IPrescriptionRepository {
    constructor() {
        super(Prescription);
    }

    async findByAppointmentId(appointmentId: string): Promise<IPrescription | null> {
        return await this._model.findOne({ appointmentId }).sort({ createdAt: -1 }).exec();
    }
}
