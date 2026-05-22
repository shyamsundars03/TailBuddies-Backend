import { IAdmin } from '../../models/admin.model';

export interface IAdminRepository {
    countDocuments(): Promise<number>;
    findOne(query: Record<string, unknown>): Promise<IAdmin | null>;
    save(admin: Partial<IAdmin>): Promise<IAdmin>;
}
