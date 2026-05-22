import { IUser } from '../../models/user.models';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IUserRepository extends IBaseRepository<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
    findByPhone(phone: string): Promise<IUser | null>;
    findUserWithPassword(email: string): Promise<IUser | null>;
    updatePassword(userId: string, password: string): Promise<void>;
    findWithFilters(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number }>;
}
