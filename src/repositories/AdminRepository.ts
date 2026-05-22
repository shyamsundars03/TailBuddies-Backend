import { IAdmin, Admin } from '../models/admin.model';
import { IAdminRepository } from './interfaces/IAdminRepository';

export class AdminRepository implements IAdminRepository {
    async countDocuments(): Promise<number> {
        return await Admin.countDocuments();
    }

    async findOne(query: Record<string, unknown>): Promise<IAdmin | null> {
        return await Admin.findOne(query);
    }

    async save(adminData: Partial<IAdmin>): Promise<IAdmin> {
        const admin = new Admin(adminData);
        return await admin.save();
    }
}
