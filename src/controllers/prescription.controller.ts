import { Request, Response } from 'express';
import { IPrescriptionService } from '../services/interfaces/IPrescriptionService';

export class PrescriptionController {
    private readonly _prescriptionService: IPrescriptionService;

    constructor(prescriptionService: IPrescriptionService) {
        this._prescriptionService = prescriptionService;
    }

    createPrescription = async (req: Request, res: Response) => {
        const result = await this._prescriptionService.createPrescription({
            ...req.body,
            vetId: (req as any).user.userId 
        });
        if (result.success) {
            return res.status(201).json(result);
        }
        return res.status(400).json(result);
    };

    getPrescriptionByAppointmentId = async (req: Request, res: Response) => {
        const appointmentId = req.params.appointmentId as string;
        const result = await this._prescriptionService.getPrescriptionByAppointmentId(appointmentId);
        if (result.success) {
            return res.status(200).json(result);
        }
        return res.status(404).json(result);
    };

    getPrescriptionById = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const result = await this._prescriptionService.getPrescriptionById(id);
        if (result.success) {
            return res.status(200).json(result);
        }
        return res.status(404).json(result);
    };

    downloadPdf = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const result = await this._prescriptionService.generatePrescriptionPdf(id);
        
        if (result.success && result.data) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=prescription-${id}.pdf`);
            return res.send(result.data);
        }
        
        return res.status(404).json(result);
    };
}
