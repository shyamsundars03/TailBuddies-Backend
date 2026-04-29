import { Response, NextFunction } from 'express';
import { IPrescriptionService } from '../services/interfaces/IPrescriptionService';
import { AuthenticatedRequest } from '../interfaces/express-request.interface';
import { HttpStatus } from '../constants';

export class PrescriptionController {
    private readonly _prescriptionService: IPrescriptionService;

    constructor(prescriptionService: IPrescriptionService) {
        this._prescriptionService = prescriptionService;
    }

    createPrescription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const vetId = req.user?.userId;
            if (!vetId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }
            const result = await this._prescriptionService.createPrescription({
                ...req.body,
                vetId
            });
            return res.status(result.success ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST).json(result);
        } catch (error) {
            next(error);
        }
    };

    getPrescriptionByAppointmentId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const appointmentId = req.params.appointmentId as string;
            const result = await this._prescriptionService.getPrescriptionByAppointmentId(appointmentId);
            return res.status(result.success ? HttpStatus.OK : HttpStatus.NOT_FOUND).json(result);
        } catch (error) {
            next(error);
        }
    };

    getPrescriptionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await this._prescriptionService.getPrescriptionById(id);
            return res.status(result.success ? HttpStatus.OK : HttpStatus.NOT_FOUND).json(result);
        } catch (error) {
            next(error);
        }
    };

    downloadPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const result = await this._prescriptionService.generatePrescriptionPdf(id);
            
            if (result.success && result.data) {
                const filename = result.filename || `prescription-${id}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                return res.send(result.data);
            }

            
            return res.status(HttpStatus.NOT_FOUND).json(result);
        } catch (error) {
            next(error);
        }
    };
}
