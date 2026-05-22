import { Response } from 'express';
import { IPrescriptionService } from '../services/interfaces/IPrescriptionService';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';
import { HttpStatus } from '../constants';
import { ApiResponse } from '../utils/api-response';
import { CreatePrescriptionInput } from '../services/interfaces/IPrescriptionService';
import { UnauthorizedError } from '../errors/app-error';

export class PrescriptionController {
    private readonly _prescriptionService: IPrescriptionService;

    constructor(prescriptionService: IPrescriptionService) {
        this._prescriptionService = prescriptionService;
    }

    createPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const vetId = req.user?.userId;
        if (!vetId) throw new UnauthorizedError();

        const result = await this._prescriptionService.createPrescription({
            ...(req.body as CreatePrescriptionInput),
            vetId,
        });
        res.status(HttpStatus.CREATED).json(ApiResponse.success('Prescription created successfully', result));
    };

    getPrescriptionByAppointmentId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        const appointmentId = req.params.appointmentId as string;
        const result = await this._prescriptionService.getPrescriptionByAppointmentId(userId, role, appointmentId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Prescription fetched', result));
    };

    getPrescriptionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        const id = req.params.id as string;
        const result = await this._prescriptionService.getPrescriptionById(userId, role, id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Prescription fetched', result));
    };

    downloadPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (!userId || !role) throw new UnauthorizedError();

        const id = req.params.id as string;
        const { data, filename } = await this._prescriptionService.generatePrescriptionPdf(userId, role, id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename || `prescription-${id}.pdf`}`);
        res.send(data);
    };
}
