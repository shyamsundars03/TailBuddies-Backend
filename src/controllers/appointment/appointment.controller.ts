import { Response, NextFunction } from 'express';
import { IAppointmentService } from '../../services/interfaces/IAppointmentService';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class AppointmentController {

    private readonly _appointmentService: IAppointmentService;

    constructor(appointmentService: IAppointmentService) {
        this._appointmentService = appointmentService;
    }

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.createAppointment({
                ...req.body,
                mode: req.body?.mode === 'online' ? 'online' : 'offline',
                ownerId: userId
            });
            res.status(result.success ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getOwnerAppointments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getDoctorAppointments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.getDoctorStats(userId);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getOwnerStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._appointmentService.getOwnerStats(userId);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    cancelPendingAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const result = await this._appointmentService.cancelPendingAppointment(id as string);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const status = req.query.status as string;

            const result = await this._appointmentService.getAllAppointments(page, limit, search, status);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id as string;
            const { reason } = req.body;
            const result = await this._appointmentService.cancelAppointment(id, userId, reason);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getAvailableSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { doctorId, date } = req.query;
            const result = await this._appointmentService.getAvailableSlots(
                doctorId as string,
                new Date(date as string)
            );
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.params.id as string;
            const result = await this._appointmentService.getAppointmentById(id);
            res.status(result.success ? HttpStatus.OK : HttpStatus.NOT_FOUND).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    checkIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.params.id as string;
            const role = req.body.role as 'owner' | 'doctor';
            const result = await this._appointmentService.checkIn(id, role);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    checkOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.params.id as string;
            const role = req.body.role as 'owner' | 'doctor';
            const result = await this._appointmentService.checkOut(id, role);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getPatientsByDoctor = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const species = req.query.species as string;
            const date = req.query.date as string;

            const result = await this._appointmentService.getPatientsByDoctor(userId, page, limit, search, species, date);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    checkSlotAvailability = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const result = await this._appointmentService.checkSlotAvailability(id as string);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getDoctorSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { date } = req.query;
            const result = await this._appointmentService.getAllSlotsForDoctor(userId, date as string);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };
}
