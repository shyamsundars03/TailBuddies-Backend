import { Response } from 'express';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { UnauthorizedError, ValidationError } from '../../errors/app-error';
import { UpdateDoctorProfileSchema, VerifyDoctorSchema } from '../../dto/doctor/doctor.schema';

export class DoctorController {
    private readonly _doctorService: IDoctorService;

    constructor(doctorService: IDoctorService) {
        this._doctorService = doctorService;
    }

    getProfile = async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();
        
        const profile = await this._doctorService.getDoctorProfile(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Profile fetched', profile));
    };

    getById = async (req: AuthenticatedRequest, res: Response) => {
        const doctorId = String(req.params.id);
        const profile = await this._doctorService.getDoctorById(doctorId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctor profile fetched', profile));
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();
        
        const parsed = UpdateDoctorProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            const details = parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));
            throw new ValidationError('Validation failed', details);
        }
        const updatedProfile = await this._doctorService.updateDoctorProfile(userId, parsed.data);
        res.status(HttpStatus.OK).json(ApiResponse.success('Profile updated successfully', updatedProfile));
    };

    verifyDoctor = async (req: AuthenticatedRequest, res: Response) => {
        const doctorId = String(req.params.id);
        const validatedData = VerifyDoctorSchema.parse(req.body);
        
        logger.info(`[DoctorController] Attempting to process verification for doctor with id: ${doctorId}`, { isVerified: validatedData.isVerified });
        const updatedDoctor = await this._doctorService.verifyDoctor(doctorId, validatedData);

        res.status(HttpStatus.OK).json(ApiResponse.success(
            `Doctor verification status updated successfully`,
            updatedDoctor
        ));
    };

    getAllDoctors = async (req: AuthenticatedRequest, res: Response) => {
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
        
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctors fetched', {
            items: result.doctors,
            total: result.total,
            page,
            limit,
        }));
    };

    requestVerification = async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();
        
        logger.info(`[DoctorController] Attempting to request verification for doctor with userId: ${userId}`);
        const updatedDoctor = await this._doctorService.requestVerification(userId);

        res.status(HttpStatus.OK).json(ApiResponse.success('Verification request submitted successfully', updatedDoctor));
    };

    getSpecialties = async (req: AuthenticatedRequest, res: Response) => {
        const specialties = await this._doctorService.getSpecialties();
        res.status(HttpStatus.OK).json(ApiResponse.success('Specialties fetched', specialties));
    };
}
