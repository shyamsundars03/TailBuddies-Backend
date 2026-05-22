import { IPrescription } from '../../models/prescription.model';
import { PrescriptionInput } from '../../dto/prescription/prescription.schema';

export interface CreatePrescriptionInput extends PrescriptionInput {
    vetId: string;
}

export interface IPrescriptionService {
    createPrescription(data: CreatePrescriptionInput): Promise<IPrescription>;
    getPrescriptionByAppointmentId(userId: string, role: string, appointmentId: string): Promise<IPrescription>;
    getPrescriptionById(userId: string, role: string, id: string): Promise<IPrescription>;
    generatePrescriptionPdf(userId: string, role: string, prescriptionId: string): Promise<{ data: Buffer; filename: string }>;
}
