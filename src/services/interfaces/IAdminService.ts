import { AdminLoginDto, AdminLoginResponseDto } from '../../dto/admin/admin-login.dto';
import { ISpecialty } from '../../models/specialty.model';
import { IUser } from '../../models/user.models';
import { 
    GetSpecialtiesInput, 
    GetUsersInput, 
    CreateSpecialtyInput, 
    UpdateSpecialtyInput 
} from '../../dto/admin/admin.schema';

export interface IAdminService {
    adminLogin(data: AdminLoginDto): Promise<AdminLoginResponseDto>;

    // Specialty Management
    createSpecialty(data: CreateSpecialtyInput): Promise<ISpecialty>;
    getSpecialties(data: GetSpecialtiesInput): Promise<{ specialties: ISpecialty[], total: number }>;
    updateSpecialty(id: string, data: UpdateSpecialtyInput): Promise<ISpecialty | null>;
    deleteSpecialty(id: string): Promise<boolean>;

    // User Management
    getUsers(data: GetUsersInput): Promise<{ users: IUser[], total: number }>;
    getUsersWithDetails(data: GetUsersInput): Promise<{ users: Array<IUser & { id: string, specialty?: string }>, total: number, ownerCount: number, doctorCount: number }>;
    toggleUserBlock(id: string): Promise<IUser | null>;
}
