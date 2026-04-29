import { Response, NextFunction } from 'express';
import { IAdminService } from '../../services/interfaces/IAdminService';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';
import { verifyDoctorSchema } from '../../utils/doctor.validator';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class AdminController {

    private readonly _adminService: IAdminService;
    private readonly _doctorService: IDoctorService;

    constructor(
        adminService: IAdminService,
        doctorService: IDoctorService
    ) {
        this._adminService = adminService;
        this._doctorService = doctorService;
    }

    adminLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: ErrorMessages.REQUIRED_FIELD,
                });
                return;
            }

            const result = await this._adminService.adminLogin({ email, password });

            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: env.jwtRefreshMaxAge,
            });

            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.ADMIN_LOGIN,
                data: {
                    user: {
                        id: result.id,
                        username: result.email,
                        email: result.email,
                        role: result.role,
                    },
                    accessToken: result.accessToken,
                },
            });
        } catch (error: unknown) {
            next(error);
        }
    };

    createSpecialty = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const specialty = await this._adminService.createSpecialty(req.body);
            res.status(HttpStatus.CREATED).json({ success: true, data: specialty });
        } catch (error: unknown) {
            next(error);
        }
    };

    getSpecialties = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(String(req.query.page || '1'));
            const limit = parseInt(String(req.query.limit || '10'));
            const search = req.query.search ? String(req.query.search) : undefined;
            const result = await this._adminService.getSpecialties(page, limit, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });
        } catch (error: unknown) {
            next(error);
        }
    };

    updateSpecialty = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            const specialty = await this._adminService.updateSpecialty(id, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: specialty });
        } catch (error: unknown) {
            next(error);
        }
    };

    deleteSpecialty = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            await this._adminService.deleteSpecialty(id);
            res.status(HttpStatus.OK).json({ success: true, message: 'Specialty deleted' });
        } catch (error: unknown) {
            next(error);
        }
    };

    getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(String(req.query.page || '1'));
            const limit = parseInt(String(req.query.limit || '10'));
            const role = req.query.role ? String(req.query.role) : undefined;
            const search = req.query.search ? String(req.query.search) : undefined;
            const result = await this._adminService.getUsersWithDetails(page, limit, role, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });
        } catch (error: unknown) {
            next(error);
        }
    };

    toggleUserBlock = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            const user = await this._adminService.toggleUserBlock(id);
            res.status(HttpStatus.OK).json({ success: true, data: user });
        } catch (error: unknown) {
            next(error);
        }
    };

    getDoctors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const isVerified = req.query.isVerified ? String(req.query.isVerified) === 'true' : undefined;
            const status = typeof req.query.status === 'string' ? req.query.status : undefined;

            const result = await this._doctorService.getAllDoctors(page, limit, search, isVerified, status);
            
            res.status(HttpStatus.OK).json({
                success: true,
                data: result.doctors,
                total: result.total,
                page,
                limit,
            });
        } catch (error: any) {
            next(error);
        }
    };

    getDoctorById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const profile: any = await this._doctorService.getDoctorById(String(id));
            res.status(HttpStatus.OK).json({ success: true, data: profile });
        } catch (error: any) {
            next(error);
        }
    };

    verifyDoctor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            
            const validationResult = verifyDoctorSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.error.format()
                });
                return;
            }

            const updatedDoctor = await this._doctorService.verifyDoctor(String(id), req.body);
            res.status(HttpStatus.OK).json({
                success: true,
                message: `Doctor ${req.body.isVerified ? 'verified' : 'rejected'} successfully`,
                data: updatedDoctor,
            });
        } catch (error: any) {
            next(error);
        }
    };
}
