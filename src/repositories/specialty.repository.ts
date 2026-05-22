import { Specialty, ISpecialty } from '../models/specialty.model';
import { BaseRepository } from './base/base.repository';
import { ISpecialtyRepository } from './interfaces/ISpecialtyRepository';

export class SpecialtyRepository extends BaseRepository<ISpecialty> implements ISpecialtyRepository {
    
    constructor() {
        super(Specialty);
    }

    async findByName(name: string): Promise<ISpecialty | null> {
        return await this.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
    }

    async findWithFilters(page: number, limit: number, search?: string): Promise<{ specialties: ISpecialty[], total: number }> {
        const filter: Record<string, unknown> = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const { items: specialties, total } = await this.findWithPagination(filter, page, limit);
        return { specialties, total };
    }
}
