import { Response } from 'express';
import { IAppointmentService } from '../../services/interfaces/IAppointmentService';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import {
    CreateAppointmentInput,
    UpdateAppointmentStatusSchema,
    CheckInSchema,
    CancelAppointmentSchema,
    GetAvailableSlotsQueryInput,
} from '../../dto/appointment/appointment.schema';
import { UnauthorizedError } from '../../errors/app-error';

export class AppointmentController {
    private readonly _appointmentService: IAppointmentService;

    constructor(appointmentService: IAppointmentService) {
        this._appointmentService = appointmentService;
    }

    create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        // console.log("Appointment Create Body:", req.body);
        const data = req.body as CreateAppointmentInput;
        const result = await this._appointmentService.createAppointment({
            ...data,
            ownerId: userId
        });

        res.status(HttpStatus.CREATED).json(ApiResponse.success('Appointment created', result));
    };

    getOwnerAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const timeframe = req.query.timeframe as string;
        const pet = req.query.pet as string;

        const result = await this._appointmentService.getAppointmentsByOwner(userId, page, limit, search, status, timeframe, pet);
        res.status(HttpStatus.OK).json(ApiResponse.success('Appointments fetched', {
            items: result.appointments,
            total: result.total
        }));
    };

    getDoctorAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

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
        res.status(HttpStatus.OK).json(ApiResponse.success('Appointments fetched', {
            items: result.appointments,
            total: result.total
        }));
    };

    getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const result = await this._appointmentService.getDoctorStats(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Stats fetched', result));
    };

    getOwnerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const result = await this._appointmentService.getOwnerStats(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Stats fetched', result));
    };

    cancelPendingAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = String(req.params.id);
        const result = await this._appointmentService.cancelPendingAppointment(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pending appointment cancelled', result));
    };

    updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const id = req.params.id as string;
        const { status, reason } = UpdateAppointmentStatusSchema.parse(req.body);

        let result;
        if (status === AppointmentStatus.CANCELLED) {
            await this._appointmentService.cancelAppointment(id, userId, reason || 'Cancelled by Doctor');
            res.status(HttpStatus.OK).json(ApiResponse.success('Appointment cancelled'));
            return;
        } else {
            result = await this._appointmentService.updateAppointmentStatus(
                id,
                status as AppointmentStatus,
                userId
            );
        }

        res.status(HttpStatus.OK).json(ApiResponse.success('Status updated', result));
    };

    getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;

        const result = await this._appointmentService.getAllAppointments(page, limit, search, status);
        res.status(HttpStatus.OK).json(ApiResponse.success('All appointments fetched', {
            items: result.appointments,
            total: result.total
        }));
    };

    cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const id = req.params.id as string;
        const { reason } = CancelAppointmentSchema.parse(req.body);
        await this._appointmentService.cancelAppointment(id, userId, reason || 'Cancelled');
        res.status(HttpStatus.OK).json(ApiResponse.success('Appointment cancelled'));
    };

    getAvailableSlots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { doctorId, date } = req.query as GetAvailableSlotsQueryInput;
        const result = await this._appointmentService.getAvailableSlots(
            doctorId,
            new Date(date)
        );
        res.status(HttpStatus.OK).json(ApiResponse.success('Available slots fetched', result));
    };

    getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const result = await this._appointmentService.getAppointmentById(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Appointment fetched', result));
    };

    checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const { role } = CheckInSchema.parse(req.body);
        const result = await this._appointmentService.checkIn(id, role);
        res.status(HttpStatus.OK).json(ApiResponse.success('Checked in successfully', result));
    };

    checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const { role } = CheckInSchema.parse(req.body);
        const result = await this._appointmentService.checkOut(id, role);
        res.status(HttpStatus.OK).json(ApiResponse.success('Checked out successfully', result));
    };

    getPatientsByDoctor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const species = req.query.species as string;
        const date = req.query.date as string;

        const result = await this._appointmentService.getPatientsByDoctor(userId, page, limit, search, species, date);
        res.status(HttpStatus.OK).json(ApiResponse.success('Patients fetched', {
            items: result.patients,
            total: result.total
        }));
    };

    checkSlotAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = String(req.params.id);
        const result = await this._appointmentService.checkSlotAvailability(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Slot availability checked', result));
    };

    getDoctorSlots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { date } = req.query;
        const result = await this._appointmentService.getAllSlotsForDoctor(userId, date as string);
        res.status(HttpStatus.OK).json(ApiResponse.success('Doctor slots fetched', result));
    };
}
