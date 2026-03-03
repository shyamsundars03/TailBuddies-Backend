import Admin from '../../models/admin.model';
import { IJwtService } from '../interfaces/IJwtService';
import { ErrorMessages } from '../../constants';
import logger from '../../logger';
import { IAdminService } from '../interfaces/IAdminService';
import { ISpecialtyRepository } from '../../repositories/interfaces/ISpecialtyRepository';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { ISpecialty } from '../../models/specialty.model';
import { IUser } from '../../models/user.models';
import { UserRole } from '../../enums/user-role.enum';

export interface AdminLoginDto {
    email: string;
    password: string;
}

export interface AdminLoginResponseDto {
    id: string;
    email: string;
    role: string;
    accessToken: string;
    refreshToken: string;
}

export class AdminService implements IAdminService {
    constructor(
        private readonly jwtService: IJwtService,
        private readonly specialtyRepository: ISpecialtyRepository,
        private readonly userRepository: IUserRepository
    ) { }

    async adminLogin(data: AdminLoginDto): Promise<AdminLoginResponseDto> {
        const { email, password } = data;
        const adminCount = await Admin.countDocuments();

        if (adminCount === 0) {
            logger.info('No admin found. Creating first admin account.', { email });
            const newAdmin = new Admin({ email, password });
            await newAdmin.save();

            const accessToken = this.jwtService.generateAccessToken({ userId: newAdmin.id, role: 'admin' });
            const refreshToken = this.jwtService.generateRefreshToken({ userId: newAdmin.id });

            return {
                id: newAdmin.id,
                email: newAdmin.email,
                role: 'admin',
                accessToken,
                refreshToken,
            };
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            throw new Error(ErrorMessages.ADMIN_INVALID_CREDENTIALS);
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            throw new Error(ErrorMessages.ADMIN_INVALID_CREDENTIALS);
        }

        const accessToken = this.jwtService.generateAccessToken({ userId: admin.id, role: 'admin' });
        const refreshToken = this.jwtService.generateRefreshToken({ userId: admin.id });

        logger.info('Admin login successful', { adminId: admin.id });

        return {
            id: admin.id,
            email: admin.email,
            role: 'admin',
            accessToken,
            refreshToken,
        };
    }

    // Specialty Management
    async createSpecialty(data: Partial<ISpecialty>): Promise<ISpecialty> {

        if (!data.name) {
            throw new Error("Specialty name is required");
        }

        // 🔍 Check for existing specialty (case-insensitive)
        const existing = await this.specialtyRepository.findOne({
            name: { $regex: new RegExp(`^${data.name}$`, "i") }
        });

        if (existing) {
            throw new Error("Specialty with this name already exists");
        }

        return await this.specialtyRepository.create(data);
    }




    async getSpecialties(page: number, limit: number, search?: string): Promise<{ specialties: ISpecialty[], total: number }> {
        const filter: any = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: { createdAt: -1 }
        };
        const specialties = await this.specialtyRepository.findAll(filter, options);
        // Since BaseRepository doesn't have countDocuments, we use the model directly or add it to repository
        // For simplicity, let's assume we can get count from the model or implement count in repository
        const total = await (this.specialtyRepository as unknown as { model: { countDocuments: Function } }).model.countDocuments(filter);
        return { specialties, total };
    }

    async updateSpecialty(id: string, data: Partial<ISpecialty>): Promise<ISpecialty | null> {
        return await this.specialtyRepository.update(id, data);
    }

    async deleteSpecialty(id: string): Promise<boolean> {
        return await this.specialtyRepository.delete(id);
    }

    // User Management
    async getUsers(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number, ownerCount: number, doctorCount: number }> {
        const filter: Record<string, any> = {};
        if (role) filter.role = role;

        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: { createdAt: -1 }
        };

        const users = await this.userRepository.findAll(filter, options);

        // Use type casting to access model if not exposed in interface
        const userModel = (this.userRepository as unknown as { model: { countDocuments: Function } }).model;
        const total = await userModel.countDocuments(filter);
        const ownerCount = await userModel.countDocuments({ role: UserRole.OWNER });
        const doctorCount = await userModel.countDocuments({ role: UserRole.DOCTOR });

        return { users, total, ownerCount, doctorCount };
    }

    async toggleUserBlock(id: string): Promise<IUser | null> {
        const user = await this.userRepository.findById(id);
        if (!user) return null;
        return await this.userRepository.update(id, { isBlocked: !user.isBlocked });
    }
}
