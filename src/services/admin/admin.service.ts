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



    private readonly _jwtService: IJwtService;
    private readonly _specialtyRepository: ISpecialtyRepository;
    private readonly _userRepository: IUserRepository;

    constructor(
        jwtService: IJwtService,
        specialtyRepository: ISpecialtyRepository,
        userRepository: IUserRepository
    ) {
        this._jwtService = jwtService;
        this._specialtyRepository = specialtyRepository;
        this._userRepository = userRepository;
    }




    async adminLogin(data: AdminLoginDto): Promise<AdminLoginResponseDto> {



        const { email, password } = data;
        const adminCount = await Admin.countDocuments();


        if (adminCount === 0) {
            logger.info('No admin found. Creating first admin account.', { email });
            const newAdmin = new Admin({ email, password });
            await newAdmin.save();



            const accessToken = this._jwtService.generateAccessToken({ userId: newAdmin.id, role: 'admin' });
            const refreshToken = this._jwtService.generateRefreshToken({ userId: newAdmin.id });



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


        const accessToken = this._jwtService.generateAccessToken({ userId: admin.id, role: 'admin' });
        const refreshToken = this._jwtService.generateRefreshToken({ userId: admin.id });


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

        
        const existing = await this._specialtyRepository.findOne({
            name: { $regex: new RegExp(`^${data.name}$`, "i") }
        });

        if (existing) {
            throw new Error("Specialty with this name already exists");
        }

        return await this._specialtyRepository.create(data);
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
        const specialties = await this._specialtyRepository.findAll(filter, options);
        


        const total = await (this._specialtyRepository as unknown as { _model: { countDocuments: Function } })._model.countDocuments(filter);
        
        
        return { specialties, total };
    }

    async updateSpecialty(id: string, data: Partial<ISpecialty>): Promise<ISpecialty | null> {
        return await this._specialtyRepository.update(id, data);
    }

    async deleteSpecialty(id: string): Promise<boolean> {
        return await this._specialtyRepository.delete(id);
    }





















    // User Management
    async getUsers(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number }> {
        const filter: Record<string, any> = {};
        if (role) filter.role = role;
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: { createdAt: -1 }
        };
        const users = await this._userRepository.findAll(filter, options);
        const total = await (this._userRepository as any)._model.countDocuments(filter);
        return { users, total };
    }

    async getUsersWithDetails(page: number, limit: number, role?: string, search?: string): Promise<{ users: IUser[], total: number, ownerCount: number, doctorCount: number }> {
        const filter: Record<string, any> = {};
        if (role) filter.role = role;

        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: { createdAt: -1 }
        };

        const users = await this._userRepository.findAll(filter, options);

        // Fetch doctor details for doctors to get their specialty
        const usersWithDetails = await Promise.all(users.map(async (user: any) => {
            const userData = user.toObject ? user.toObject() : user;
            if (userData.role === UserRole.DOCTOR) {
                const { Doctor } = require('../../models/doctor.model');
                const doctor = await Doctor.findOne({ userId: userData._id })
                    .populate('profile.specialtyId');
                
                return {
                    ...userData,
                    id: userData._id.toString(),
                    specialty: doctor?.profile?.specialtyId?.name || 'Not Set'
                };
            }
            return {
                ...userData,
                id: userData._id.toString()
            };
        }));

        const userModel = (this._userRepository as unknown as { _model: { countDocuments: Function } })._model;
        const total = await userModel.countDocuments(filter);
        const ownerCount = await userModel.countDocuments({ role: UserRole.OWNER });
        const doctorCount = await userModel.countDocuments({ role: UserRole.DOCTOR });

        return { users: usersWithDetails, total, ownerCount, doctorCount };
    }



    async toggleUserBlock(id: string): Promise<IUser | null> {
        const user = await this._userRepository.findById(id);
        if (!user) return null;
        return await this._userRepository.update(id, { isBlocked: !user.isBlocked });
    }

    
}
