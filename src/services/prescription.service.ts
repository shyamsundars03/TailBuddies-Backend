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

            // Check if a prescription already exists for this appointment
            let prescription = await this._prescriptionRepository.model.findOne({ appointmentId: data.appointmentId }).session(session);

            if (prescription) {
                // Update existing prescription
                Object.assign(prescription, {
                    ...data,
                    vetId: doctor._id
                    // We keep the original prescriptionId
                });
                await prescription.save({ session });
                logger.info(`Updated existing prescription ${prescription.prescriptionId} for appointment ${data.appointmentId}`);
            } else {
                // Create new prescription
                const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
                const prescriptionId = `PRE${randomDigits}`;

                prescription = (await this._prescriptionRepository.model.create([{
                    ...data,
                    vetId: doctor._id,
                    prescriptionId
                }], { session }))[0];
                logger.info(`Created new prescription ${prescription.prescriptionId} for appointment ${data.appointmentId}`);
            }

            // Update appointment with prescription ID to ensure it's linked
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
            // 1. Try to find via the Appointment link first (most accurate for specific consultations)
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (appointment && appointment.prescriptionId) {
                const prescription = await this._prescriptionRepository.findById(appointment.prescriptionId.toString());
                if (prescription) {
                    logger.info(`Fetched prescription ${prescription.prescriptionId} via appointment link for ${appointmentId}`);
                    return { success: true, data: prescription };
                }
            }

            // 2. Fallback to searching by ID (legacy support or if link is missing)
            const prescription = await this._prescriptionRepository.findByAppointmentId(appointmentId);
            if (!prescription) {
                return { success: false, message: 'Prescription not found' };
            }
            logger.info(`Fetched prescription ${prescription.prescriptionId} via appointmentId search for ${appointmentId}`);
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
