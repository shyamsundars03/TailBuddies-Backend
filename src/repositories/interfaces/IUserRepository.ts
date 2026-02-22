import { IUser } from '../../models/user.models';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IUserRepository extends IBaseRepository<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
    findByPhone(phone: string): Promise<IUser | null>;
    findUserWithPassword(email: string): Promise<IUser | null>;
}
