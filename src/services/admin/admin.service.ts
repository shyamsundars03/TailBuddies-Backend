import { IJwtService } from '../interfaces/IJwtService';
import { ErrorMessages } from '../../constants';
import logger from '../../logger';
import { IAdminService } from '../interfaces/IAdminService';
import { ISpecialtyRepository } from '../../repositories/interfaces/ISpecialtyRepository';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { ISpecialty } from '../../models/specialty.model';
import { IUser } from '../../models/user.models';
import { UserRole } from '../../enums/user-role.enum';
import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../errors/app-error';
import { IAdminRepository } from '../../repositories/interfaces/IAdminRepository';
import { AdminLoginDto, AdminLoginResponseDto } from '../../dto/admin/admin-login.dto';
import { 
  GetSpecialtiesInput, 
  GetUsersInput, 
  CreateSpecialtyInput, 
  UpdateSpecialtyInput 
} from '../../dto/admin/admin.schema';

export class AdminService implements IAdminService {
  private readonly _jwtService: IJwtService;
  private readonly _specialtyRepository: ISpecialtyRepository;
  private readonly _userRepository: IUserRepository;
  private readonly _adminRepository: IAdminRepository;
  private readonly _doctorRepository: IDoctorRepository;

  constructor(
    jwtService: IJwtService,
    specialtyRepository: ISpecialtyRepository,
    userRepository: IUserRepository,
    adminRepository: IAdminRepository,
    doctorRepository: IDoctorRepository
  ) {
    this._jwtService = jwtService;
    this._specialtyRepository = specialtyRepository;
    this._userRepository = userRepository;
    this._adminRepository = adminRepository;
    this._doctorRepository = doctorRepository;
  }

  async adminLogin(data: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { email, password } = data;
    const adminCount = await this._adminRepository.countDocuments();

    if (adminCount === 0) {
      logger.info('No admin found. Creating first admin account.', { email });
      const newAdmin = await this._adminRepository.save({ email, password });

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

    const admin = await this._adminRepository.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new UnauthorizedError(ErrorMessages.ADMIN_INVALID_CREDENTIALS);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError(ErrorMessages.ADMIN_INVALID_CREDENTIALS);
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
  async createSpecialty(data: CreateSpecialtyInput): Promise<ISpecialty> {
    const existing = await this._specialtyRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError("Specialty with this name already exists");
    }
    return await this._specialtyRepository.create(data);
  }

  async getSpecialties(data: GetSpecialtiesInput): Promise<{ specialties: ISpecialty[], total: number }> {
    return await this._specialtyRepository.findWithFilters(data.page, data.limit, data.search);
  }

  async updateSpecialty(id: string, data: UpdateSpecialtyInput): Promise<ISpecialty | null> {
    if (data.name) {
      const existing = await this._specialtyRepository.findByName(data.name);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictError("Specialty with this name already exists");
      }
    }
    return await this._specialtyRepository.update(id, data);
  }

  async deleteSpecialty(id: string): Promise<boolean> {
    return await this._specialtyRepository.delete(id);
  }

  // User Management
  async getUsers(data: GetUsersInput): Promise<{ users: IUser[], total: number }> {
    return await this._userRepository.findWithFilters(data.page, data.limit, data.role, data.search);
  }

  async getUsersWithDetails(data: GetUsersInput): Promise<{ users: Array<IUser & { id: string, specialty?: string }>, total: number, ownerCount: number, doctorCount: number }> {
    const { page, limit, role, search } = data;
    
    const { users, total } = await this._userRepository.findWithFilters(page, limit, role, search);

    const usersWithDetails = await Promise.all(users.map(async (user: IUser) => {
      const userData = user.toObject ? user.toObject() : user;
      const userId = userData.id || userData._id.toString();
      
      if (userData.role === UserRole.DOCTOR) {
        const doctor = await this._doctorRepository.findByUserIdWithDetails(userId);
        const specialtyName = (doctor?.profile?.specialtyId as unknown as { name: string })?.name || 'Not Set';
        
        return {
          ...userData,
          id: userId,
          specialty: specialtyName
        };
      }
      return {
        ...userData,
        id: userId
      };
    }));

    const ownerCount = await this._userRepository.countDocuments({ role: UserRole.OWNER });
    const doctorCount = await this._userRepository.countDocuments({ role: UserRole.DOCTOR });

    return { users: usersWithDetails, total, ownerCount, doctorCount };
  }

  async toggleUserBlock(id: string): Promise<IUser | null> {
    const user = await this._userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return await this._userRepository.update(id, { isBlocked: !user.isBlocked });
  }
}
