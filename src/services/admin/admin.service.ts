import Admin from '../../models/admin.model';
import { IJwtService } from '../interfaces/IJwtService';
import { ErrorMessages } from '../../constants';
import logger from '../../logger';

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





export class AdminService {



    constructor(private readonly jwtService: IJwtService) { }

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

        
// this is the normal way 


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

    
}
