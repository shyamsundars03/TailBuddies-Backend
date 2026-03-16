import { Doctor, IDoctor } from '../models/doctor.model';
import { BaseRepository } from './base/base.repository';
import { IDoctorRepository } from './interfaces/IDoctorRepository';

export class DoctorRepository extends BaseRepository<IDoctor> implements IDoctorRepository {
    constructor() {
        super(Doctor);
    }

    async findByUserId(userId: string): Promise<IDoctor | null> {
        return await this.model.findOne({ userId }).populate('userId');
    }

    async findAll(filter: any = {}, options: any = {}): Promise<IDoctor[]> {
        return await this.model.find(filter, null, options).populate('userId') as any;
    }
}
