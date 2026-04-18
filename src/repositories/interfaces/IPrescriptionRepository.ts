import { IPrescription } from '../../models/prescription.model';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IPrescriptionRepository extends IBaseRepository<IPrescription> {
    findByAppointmentId(appointmentId: string): Promise<IPrescription | null>;
}
