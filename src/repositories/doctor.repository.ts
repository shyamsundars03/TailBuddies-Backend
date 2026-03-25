import { Doctor, IDoctor } from '../models/doctor.model';
import { BaseRepository } from './base/base.repository';
import { IDoctorRepository } from './interfaces/IDoctorRepository';

export class DoctorRepository extends BaseRepository<IDoctor> implements IDoctorRepository {
    
    
    constructor() {
        super(Doctor);
    }





    async findByUserId(userId: string): Promise<IDoctor | null> {
        return await this._model.findOne({ userId }).populate('userId');
    }

    async findAll(filter: any = {}, options: any = {}): Promise<IDoctor[]> {
        return await this._model.find(filter, null, options).populate('userId') as any;
    }







    async findByUserIdWithDetails(userId: string): Promise<IDoctor | null> {
        return await this._model.findOne({ userId })
            .populate({ path: 'userId', select: 'userName email gender phone profilePic isBlocked', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
    }








    async findByIdWithDetails(doctorId: string): Promise<IDoctor | null> {
        return await this._model.findById(doctorId)
            .populate({ path: 'userId', select: 'userName email gender phone profilePic isBlocked', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
    }







    
}
