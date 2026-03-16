import { Request, Response } from 'express';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class DoctorController {
    constructor(private readonly doctorService: IDoctorService) { }

    getProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            const profile = await this.doctorService.getDoctorProfile(userId);

            res.status(HttpStatus.OK).json({
                success: true,
                data: profile,
            });
        } catch (error: any) {
            logger.error('Error fetching doctor profile', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const profile: any = await this.doctorService.getDoctorById(String(id));

            console.log(`[DoctorController] Fetched doctor ${id} for Admin. Population check:`, {
                hasUserId: !!profile?.userId,
                userIdType: typeof profile?.userId,
                hasSpecialtyId: !!profile?.profile?.specialtyId,
                specialtyIdType: typeof profile?.profile?.specialtyId,
                specialtyName: profile?.profile?.specialtyId?.name
            });

            res.status(HttpStatus.OK).json({
                success: true,
                data: profile,
            });
        } catch (error: any) {
            logger.error('Error fetching doctor by id', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    updateProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            const updatedProfile = await this.doctorService.updateDoctorProfile(userId, req.body);

            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedProfile,
            });
        } catch (error: any) {
            logger.error('Error updating doctor profile', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    verifyDoctor = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { isVerified } = req.body;
            logger.info(`[DoctorController] Attempting to ${isVerified ? 'verify' : 'reject'} doctor with id: ${id}`);
            const updatedDoctor = await this.doctorService.verifyDoctor(String(id), req.body);

            res.status(HttpStatus.OK).json({
                success: true,
                message: `Doctor ${req.body.isVerified ? 'verified' : 'rejected'} successfully`,
                data: updatedDoctor,
            });
            logger.info(`[DoctorController] Doctor with id: ${id} ${isVerified ? 'verified' : 'rejected'} successfully.`);
        } catch (error: any) {
            logger.error('Error verifying doctor', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    getAllDoctors = async (req: Request, res: Response) => {
        try {
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const isVerified = req.query.isVerified ? String(req.query.isVerified) === 'true' : undefined;

            logger.info(`[DoctorController] Fetching all doctors with page: ${page}, limit: ${limit}, search: ${search}, isVerified: ${isVerified}`);
            const result = await this.doctorService.getAllDoctors(page, limit, search, isVerified);

            res.status(HttpStatus.OK).json({
                success: true,
                data: result.doctors,
                total: result.total,
                page,
                limit,
            });
            logger.info(`[DoctorController] Successfully fetched ${result.doctors.length} doctors (total: ${result.total})`);
        } catch (error: any) {
            logger.error('Error fetching all doctors', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    requestVerification = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            console.log(`[DoctorController] Received verification request for user: ${userId}`);
            logger.info(`[DoctorController] Attempting to request verification for doctor with userId: ${userId}`);
            const updatedDoctor = await this.doctorService.requestVerification(userId);

            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Verification request submitted successfully',
                data: updatedDoctor,
            });
        } catch (error: any) {
            logger.error('Error requesting verification', { error: error.message });
            res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    getSpecialties = async (req: Request, res: Response) => {
        try {
            console.log(`[DoctorController] Fetching specialties for user: ${(req as any).user?.userId}`);
            const specialties = await this.doctorService.getSpecialties();
            console.log(`[DoctorController] Found ${specialties.length} specialties`);
            res.status(HttpStatus.OK).json({
                success: true,
                data: specialties,
            });
        } catch (error: any) {
            logger.error('Error fetching specialties for doctor', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };
}
