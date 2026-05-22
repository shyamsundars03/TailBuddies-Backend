import { Response } from 'express';
import { IAdminService } from '../../services/interfaces/IAdminService';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus, SuccessMessages } from '../../constants';
import { ApiResponse } from '../../utils/api-response';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class AdminController {
    private readonly _adminService: IAdminService;
    private readonly _doctorService: IDoctorService;

    constructor(adminService: IAdminService, doctorService: IDoctorService) {
        this._adminService = adminService;
        this._doctorService = doctorService;
    }

    adminLogin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const result = await this._adminService.adminLogin(req.body);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: env.jwtRefreshMaxAge,
        });

        res.status(HttpStatus.OK).json(ApiResponse.success(SuccessMessages.ADMIN_LOGIN, {
            user: {
                id: result.id,
                username: result.email,
                email: result.email,
                role: result.role,
            },
            accessToken: result.accessToken,
        }));
    };

    createSpecialty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const specialty = await this._adminService.createSpecialty(req.body);
        res.status(HttpStatus.CREATED).json(ApiResponse.success('Specialty created', specialty));
    };

    getSpecialties = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = parseInt(String(req.query.page || '1'));
        const limit = parseInt(String(req.query.limit || '10'));
        const search = req.query.search ? String(req.query.search) : undefined;
        
        const result = await this._adminService.getSpecialties({ page, limit, search });
        res.status(HttpStatus.OK).json(ApiResponse.success('Specialties fetched', {
            items: result.specialties || [],
            total: result.total || 0,
            page,
            limit
        }));
    };

    updateSpecialty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const specialtyId = String(req.params.id);
        const specialty = await this._adminService.updateSpecialty(specialtyId, req.body);
        res.status(HttpStatus.OK).json(ApiResponse.success('Specialty updated', specialty));
    };

    deleteSpecialty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const specialtyId = String(req.params.id);
        await this._adminService.deleteSpecialty(specialtyId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Specialty deleted'));
    };

    getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = parseInt(String(req.query.page || '1'));
        const limit = parseInt(String(req.query.limit || '10'));
        const role = req.query.role ? String(req.query.role) : undefined;
        const search = req.query.search ? String(req.query.search) : undefined;
        
        const result = await this._adminService.getUsersWithDetails({ page, limit, role, search });
        res.status(HttpStatus.OK).json(ApiResponse.success('Users fetched', {
            items: result.users || [],
            total: result.total || 0,
            ownerCount: result.ownerCount || 0,
            doctorCount: result.doctorCount || 0,
            page,
            limit
        }));
    };

    toggleUserBlock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = String(req.params.id);
        const user = await this._adminService.toggleUserBlock(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('User status toggled', user));
    };

    getDoctors = async (req: AuthenticatedRequest, res: Response) => {
        const page = parseInt(String(req.query.page)) || 1;
        const limit = parseInt(String(req.query.limit)) || 5;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const isVerified = req.query.isVerified ? String(req.query.isVerified) === 'true' : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;

        const result = await this._doctorService.getAllDoctors(page, limit, search, isVerified, status);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctors fetched', {
            items: result.doctors || [],
            total: result.total || 0,
            page,
            limit,
        }));
    };

    getDoctorById = async (req: AuthenticatedRequest, res: Response) => {
        const doctorId = String(req.params.id);
        const profile = await this._doctorService.getDoctorById(doctorId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctor profile fetched', profile));
    };

    verifyDoctor = async (req: AuthenticatedRequest, res: Response) => {
        const doctorId = String(req.params.id);
        const updatedDoctor = await this._doctorService.verifyDoctor(doctorId, req.body);
        const message = req.body.isVerified === undefined
            ? 'Doctor verification section updated successfully'
            : `Doctor ${req.body.isVerified ? 'verified' : 'rejected'} successfully`;
        res.status(HttpStatus.OK).json(ApiResponse.success(message, updatedDoctor));
    };
}
