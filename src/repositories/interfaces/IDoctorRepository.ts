import { IDoctor } from '../../models/doctor.model';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IDoctorRepository extends IBaseRepository<IDoctor> {
    findByUserId(userId: string): Promise<IDoctor | null>;
}
