import { IPrescription } from '../../models/prescription.model';

export interface IPrescriptionService {
    createPrescription(data: any): Promise<{ success: boolean; data?: IPrescription; message?: string }>;
    getPrescriptionByAppointmentId(appointmentId: string): Promise<{ success: boolean; data?: IPrescription; message?: string }>;
    getPrescriptionById(id: string): Promise<{ success: boolean; data?: IPrescription; message?: string }>;
    generatePrescriptionPdf(prescriptionId: string): Promise<{ success: boolean; data?: Buffer; filename?: string; message?: string }>;
}
