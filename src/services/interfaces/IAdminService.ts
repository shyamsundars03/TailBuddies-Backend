import { AdminLoginDto, AdminLoginResponseDto } from '../admin/admin.service';
import { ISpecialty } from '../../models/specialty.model';
import { IUser } from '../../models/user.models';

export interface IAdminService {
    adminLogin(data: AdminLoginDto): Promise<AdminLoginResponseDto>;

    // Specialty Management
    createSpecialty(data: Partial<ISpecialty>): Promise<ISpecialty>;
    getSpecialties(page: number, limit: number, search?: string): Promise<{ specialties: ISpecialty[], total: number }>;
    updateSpecialty(id: string, data: Partial<ISpecialty>): Promise<ISpecialty | null>;
    deleteSpecialty(id: string): Promise<boolean>;

    // User Management
    getUsers(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number, ownerCount: number, doctorCount: number }>;
    toggleUserBlock(id: string): Promise<IUser | null>;
}
