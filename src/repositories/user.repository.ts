import { User, IUser } from '../models/user.models';
import { BaseRepository } from './base/base.repository';
import { IUserRepository } from './interfaces/IUserRepository';

export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await this.findOne({ email: email.toLowerCase() });
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    return await this.findOne({ phone });
  }

  async findUserWithPassword(email: string): Promise<IUser | null> {
    return await this._model.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const user = await this._model.findById(userId);
    if (user) {
      user.password = password;
      await user.save();
    }
  }

  async findWithFilters(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number }> {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const { items: users, total } = await this.findWithPagination(filter, page, limit);
    return { users, total };
  }
}