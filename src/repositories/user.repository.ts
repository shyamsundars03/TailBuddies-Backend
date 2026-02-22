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
    return await this.model.findOne({ email: email.toLowerCase() }).select('+password');
  }
}