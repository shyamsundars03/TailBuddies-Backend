import { IPrescriptionService } from './interfaces/IPrescriptionService';
import { IPrescriptionRepository } from '../repositories/interfaces/IPrescriptionRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IPrescription } from '../models/prescription.model';
import { IPdfService } from './interfaces/IPdfService';
import mongoose from 'mongoose';
import logger from '../logger';

export class PrescriptionService implements IPrescriptionService {
    private readonly _prescriptionRepository: IPrescriptionRepository;
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _pdfService: IPdfService;

    constructor(
        prescriptionRepository: IPrescriptionRepository,
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        pdfService: IPdfService
    ) {
        this._prescriptionRepository = prescriptionRepository;
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._pdfService = pdfService;
    }

    async createPrescription(data: any): Promise<{ success: boolean; data?: IPrescription; message?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Map userId to doctorId
            const doctor = await this._doctorRepository.findByUserId(data.vetId);
            if (!doctor) throw new Error('Doctor profile not found for this user');

            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            const prescriptionId = `PRE${randomDigits}`;

            const prescription = await this._prescriptionRepository.create({
                ...data,
                vetId: doctor._id,
                prescriptionId
            });

            // Update appointment with prescription ID
            await (this._appointmentRepository as any).model.findByIdAndUpdate(
                data.appointmentId,
                { prescriptionId: prescription._id }
            ).session(session);

            await session.commitTransaction();
            return { success: true, data: prescription };
        } catch (error: any) {
            await session.abortTransaction();
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async getPrescriptionByAppointmentId(appointmentId: string): Promise<{ success: boolean; data?: IPrescription; message?: string }> {
        try {
            const prescription = await this._prescriptionRepository.findByAppointmentId(appointmentId);
            if (!prescription) {
                return { success: false, message: 'Prescription not found' };
            }
            return { success: true, data: prescription };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getPrescriptionById(id: string): Promise<{ success: boolean; data?: IPrescription; message?: string }> {
        try {
            const prescription = await this._prescriptionRepository.findById(id);
            if (!prescription) {
                return { success: false, message: 'Prescription not found' };
            }
            return { success: true, data: prescription };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async generatePrescriptionPdf(prescriptionId: string): Promise<{ success: boolean; data?: Buffer; message?: string }> {
        try {
            const prescription = await this._prescriptionRepository.findById(prescriptionId);
            if (!prescription) return { success: false, message: 'Prescription not found' };

            const appointment = await this._appointmentRepository.findWithDetails({ _id: prescription.appointmentId });
            if (!appointment || appointment.length === 0) return { success: false, message: 'Appointment not found' };

            const pdfBuffer = await this._pdfService.generatePrescriptionPdf(prescription, appointment[0]);
            return { success: true, data: pdfBuffer };
        } catch (error: any) {
            logger.error('Error in PrescriptionService.generatePrescriptionPdf', { error: error.message });
            return { success: false, message: error.message };
        }
    }
}
