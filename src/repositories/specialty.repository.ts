import { Specialty, ISpecialty } from '../models/specialty.model';
import { BaseRepository } from './base/base.repository';
import { ISpecialtyRepository } from './interfaces/ISpecialtyRepository';

export class SpecialtyRepository extends BaseRepository<ISpecialty> implements ISpecialtyRepository {
    constructor() {
        super(Specialty);
    }

    async findByName(name: string): Promise<ISpecialty | null> {
        return await this.findOne({ name });
    }
}
