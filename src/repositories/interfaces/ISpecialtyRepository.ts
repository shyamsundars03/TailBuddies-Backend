import { ISpecialty } from '../../models/specialty.model';
import { IBaseRepository } from '../base/base.repository.interface';

export interface ISpecialtyRepository extends IBaseRepository<ISpecialty> {
    findByName(name: string): Promise<ISpecialty | null>;
}
