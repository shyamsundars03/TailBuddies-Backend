import { Response, NextFunction } from 'express';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class DoctorController {

    private readonly _doctorService: IDoctorService;

    constructor(doctorService: IDoctorService) {
        this._doctorService = doctorService;
    }

    getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }
            const profile = await this._doctorService.getDoctorProfile(userId);

            res.status(HttpStatus.OK).json({
                success: true,
                data: profile,
            });
        } catch (error: any) {
            next(error);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const profile: any = await this._doctorService.getDoctorById(String(id));

            res.status(HttpStatus.OK).json({
                success: true,
                data: profile,
            });
        } catch (error: any) {
            next(error);
        }
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }
            const updatedProfile = await this._doctorService.updateDoctorProfile(userId, req.body);

            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedProfile,
            });
        } catch (error: any) {
            next(error);
        }
    };

    verifyDoctor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { isVerified } = req.body;
            logger.info(`[DoctorController] Attempting to ${isVerified ? 'verify' : 'reject'} doctor with id: ${id}`);
            const updatedDoctor = await this._doctorService.verifyDoctor(String(id), req.body);

            res.status(HttpStatus.OK).json({
                success: true,
                message: `Doctor ${req.body.isVerified ? 'verified' : 'rejected'} successfully`,
                data: updatedDoctor,
            });
            logger.info(`[DoctorController] Doctor with id: ${id} ${isVerified ? 'verified' : 'rejected'} successfully.`);
        } catch (error: any) {
            next(error);
        }
    };

    getAllDoctors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(String(req.query.page)) || 1;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const status = typeof req.query.status === 'string' ? req.query.status : undefined;
            const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;

            const isAdmin = req.user?.role === 'admin';
            const limit = parseInt(String(req.query.limit)) || (isAdmin ? 10 : 9);

            let isVerified = req.query.isVerified !== undefined ? String(req.query.isVerified) === 'true' : undefined;
            if (!isAdmin && isVerified === undefined) {
                isVerified = true;
            }

            const filters = {
                specialty: req.query.specialty,
                gender: req.query.gender,
                experienceYears: req.query.experienceYears,
                city: req.query.city,
                minRating: req.query.minRating
            };

            logger.info(`[DoctorController] Fetching doctors: page=${page}, limit=${limit}, search=${search}, isVerified=${isVerified}, sortBy=${sortBy}`);
            const result = await this._doctorService.getAllDoctors(page, limit, search, isVerified, status, filters, sortBy);

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

    requestVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }
            logger.info(`[DoctorController] Attempting to request verification for doctor with userId: ${userId}`);
            const updatedDoctor = await this._doctorService.requestVerification(userId);

            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Verification request submitted successfully',
                data: updatedDoctor,
            });
        } catch (error: any) {
            next(error);
        }
    };

    getSpecialties = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const specialties = await this._doctorService.getSpecialties();
            res.status(HttpStatus.OK).json({
                success: true,
                data: specialties,
            });
        } catch (error: any) {
            next(error);
        }
    };
}
