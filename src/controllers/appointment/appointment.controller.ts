import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { IAppointmentService } from '../../services/interfaces/IAppointmentService';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class AppointmentController {




    private readonly _appointmentService: IAppointmentService;

    constructor(appointmentService: IAppointmentService) {
        this._appointmentService = appointmentService;
    }







    create = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.createAppointment({
                ...req.body,
                ownerId: userId
            });
            if (result.success) {
                res.status(HttpStatus.CREATED).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error creating appointment', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };










    getOwnerAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const status = req.query.status as string;
            const timeframe = req.query.timeframe as string;
            const result = await this._appointmentService.getAppointmentsByOwner(userId, page, limit, search, status, timeframe);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching owner appointments', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };












    getDoctorAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { status } = req.query;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await this._appointmentService.getAppointmentsByDoctor(
                userId,
                status as string | undefined,
                page,
                limit,
                search
            );
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching doctor appointments', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getStats = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.getDoctorStats(userId);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching doctor stats', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getOwnerStats = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.getOwnerStats(userId);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching owner stats', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    cancelPendingAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const result = await this._appointmentService.cancelPendingAppointment(id as string);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error cancelling pending appointment', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

















    updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {

        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id as string;
            const { status, reason } = req.body;

            let result;
            if (status === AppointmentStatus.CANCELLED) {
                result = await this._appointmentService.cancelAppointment(id, userId, reason || 'Cancelled by Doctor');
            } else {
                result = await this._appointmentService.updateAppointmentStatus(
                    id,
                    status as AppointmentStatus,
                    userId
                );
            }

            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error updating appointment status', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };













    getAll = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const status = req.query.status as string;

            const result = await this._appointmentService.getAllAppointments(page, limit, search, status);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching all appointments', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };












    cancel = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id as string;
            const { reason } = req.body;
            const result = await this._appointmentService.cancelAppointment(id, userId, reason);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error cancelling appointment', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };












    getAvailableSlots = async (req: AuthRequest, res: Response): Promise<void> => {
        logger.info('AppointmentController.getAvailableSlots hit', { query: req.query });
        try {
            const { doctorId, date } = req.query;
            const result = await this._appointmentService.getAvailableSlots(
                doctorId as string,
                new Date(date as string)
            );


            // console.log("backend:", result)

            logger.info(`backend:`, result)


            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching available slots', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };














    getById = async (req: AuthRequest, res: Response): Promise<void> => {
        logger.info('AppointmentController.getById hit', { id: req.params.id });
        try {
            const id = req.params.id as string;
            const result = await this._appointmentService.getAppointmentById(id);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.NOT_FOUND).json(result);
        } catch (error: any) {
            logger.error('Error fetching appointment by ID', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };









    checkIn = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const id = req.params.id as string;
            const role = req.body.role as 'owner' | 'doctor';
            const result = await this._appointmentService.checkIn(id, role);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error during check-in', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };










    checkOut = async (req: AuthRequest, res: Response): Promise<void> => {
        logger.info('AppointmentController.checkOut hit', { id: req.params.id, body: req.body });
        try {
            const id = req.params.id as string;
            const role = req.body.role as 'owner' | 'doctor';
            const result = await this._appointmentService.checkOut(id, role);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error during check-out', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
    getPatientsByDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await this._appointmentService.getPatientsByDoctor(userId, page, limit, search);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error fetching doctor patients', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    checkSlotAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const result = await this._appointmentService.checkSlotAvailability(id as string);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error checking slot availability', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
}
