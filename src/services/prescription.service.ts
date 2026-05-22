import { IPrescriptionService, CreatePrescriptionInput } from './interfaces/IPrescriptionService';
import { IPrescriptionRepository } from '../repositories/interfaces/IPrescriptionRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IPrescription } from '../models/prescription.model';
import { IPdfService } from './interfaces/IPdfService';
import { INotificationService } from './notification.service';
import { AppointmentAccessService } from './appointment-access.service';
import mongoose, { FilterQuery } from 'mongoose';
import logger from '../logger';
import { NotFoundError } from '../errors/app-error';
import { asPopulatedPrescription } from '../types/populated.types';

export class PrescriptionService implements IPrescriptionService {
    private readonly _prescriptionRepository: IPrescriptionRepository;
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _pdfService: IPdfService;
    private readonly _notificationService: INotificationService;
    private readonly _appointmentAccessService: AppointmentAccessService;

    constructor(
        prescriptionRepository: IPrescriptionRepository,
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        pdfService: IPdfService,
        notificationService: INotificationService,
        appointmentAccessService: AppointmentAccessService
    ) {
        this._prescriptionRepository = prescriptionRepository;
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._pdfService = pdfService;
        this._notificationService = notificationService;
        this._appointmentAccessService = appointmentAccessService;
    }

    private resolveMongoId(id: string): string {
        if (id.includes('{') || id.includes('ObjectId')) {
            const idMatch = id.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i)
                || id.match(/([a-f\d]{24})/i);
            if (idMatch) return idMatch[1];
        }
        return id;
    }

    private async assertPrescriptionAccess(
        appointmentId: string,
        userId: string,
        role: string
    ): Promise<void> {
        await this._appointmentAccessService.assertAppointmentAccess(appointmentId, userId, role);
    }

    async createPrescription(data: CreatePrescriptionInput): Promise<IPrescription> {
        const doctor = await this._doctorRepository.findByUserId(data.vetId);
        if (!doctor) throw new NotFoundError('Doctor profile not found for this user');

        let prescription = await this._prescriptionRepository.findOne({ appointmentId: data.appointmentId });

        if (prescription) {
            Object.assign(prescription, {
                ...data,
                vetId: doctor._id
            });

            prescription.markModified('vitals');
            prescription.markModified('medications');

            await prescription.save();
            logger.info(`Updated existing prescription ${prescription.prescriptionId} for appointment ${data.appointmentId}`);
        } else {
            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            const prescriptionId = `PRE${randomDigits}`;

            prescription = await this._prescriptionRepository.create({
                ...data,
                vetId: doctor._id,
                prescriptionId,
            } as unknown as Partial<IPrescription>);
            logger.info(`Created new prescription ${prescription.prescriptionId} for appointment ${data.appointmentId}`);
        }

        await this._appointmentRepository.update(data.appointmentId, {
            prescriptionId: prescription._id.toString(),
        } as unknown as Partial<import('../models/appointment.model').IAppointment>);

        try {
            const appointment = await this._appointmentRepository.findById(data.appointmentId);
            if (appointment) {
                await this._notificationService.createNotification(
                    appointment.ownerId.toString(),
                    'New Prescription Available',
                    `A new prescription has been issued for your recent consultation. You can view or download it now.`,
                    'prescription',
                    `/owner/appointments/${data.appointmentId}`
                );
            }
        } catch (notiError) {
            logger.error('Error creating notification for prescription', { notiError });
        }

        const { SocketService } = require('./socket.service');
        if (SocketService.io) {
            SocketService.io.to(`appointment:${data.appointmentId}`).emit('status-updated', {
                prescriptionId: prescription._id
            });
        }

        return prescription;
    }

    async getPrescriptionByAppointmentId(userId: string, role: string, appointmentId: string): Promise<IPrescription> {
        await this.assertPrescriptionAccess(appointmentId, userId, role);

        const appointment = await this._appointmentRepository.findById(appointmentId);
        if (appointment && appointment.prescriptionId) {
            const populatedPrescription = asPopulatedPrescription(appointment.prescriptionId);
            if (populatedPrescription) {
                return populatedPrescription;
            }

            let idToUse = appointment.prescriptionId.toString();
            if (idToUse.includes('{') || idToUse.includes('ObjectId')) {
                const idMatch = idToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
                if (idMatch) {
                    idToUse = idMatch[1];
                }
            }

            const prescription = await this._prescriptionRepository.findById(idToUse);
            if (prescription) return prescription;
        }

        const prescription = await this._prescriptionRepository.findByAppointmentId(appointmentId);
        if (!prescription) throw new NotFoundError('Prescription not found');
        return prescription;
    }

    async getPrescriptionById(userId: string, role: string, id: string): Promise<IPrescription> {
        const prescription = await this.findPrescriptionById(id);
        const appointmentId = this.resolveMongoId(prescription.appointmentId.toString());
        await this.assertPrescriptionAccess(appointmentId, userId, role);
        return prescription;
    }

    private async findPrescriptionById(id: string): Promise<IPrescription> {
        const idToUse = this.resolveMongoId(id);

        const query: FilterQuery<IPrescription> = {
            $or: [{ prescriptionId: idToUse }],
        };

        if (mongoose.Types.ObjectId.isValid(idToUse)) {
            query.$or?.push({ _id: new mongoose.Types.ObjectId(idToUse) });
            query.$or?.push({ appointmentId: new mongoose.Types.ObjectId(idToUse) });
        }

        const prescription = await this._prescriptionRepository.findOne(query as Record<string, unknown>);
        if (!prescription) throw new NotFoundError(`Prescription not found for ID: ${idToUse}`);
        return prescription;
    }

    async generatePrescriptionPdf(userId: string, role: string, prescriptionId: string): Promise<{ data: Buffer; filename: string }> {
        const idToUse = this.resolveMongoId(prescriptionId);

        const query: FilterQuery<IPrescription> = {
            $or: [{ prescriptionId: idToUse }],
        };

        if (mongoose.Types.ObjectId.isValid(idToUse)) {
            const oid = new mongoose.Types.ObjectId(idToUse);
            query.$or?.push({ _id: oid });
            query.$or?.push({ appointmentId: oid });
        }

        let prescription = await this._prescriptionRepository.findOne(query as Record<string, unknown>);

        if (!prescription && mongoose.Types.ObjectId.isValid(idToUse)) {
            prescription = await this._prescriptionRepository.findByAppointmentId(idToUse);
        }

        if (!prescription && mongoose.Types.ObjectId.isValid(idToUse)) {
            const appointment = await this._appointmentRepository.findById(idToUse);
            if (appointment && appointment.prescriptionId) {
                prescription = await this._prescriptionRepository.findById(appointment.prescriptionId.toString());
            }
        }

        if (!prescription) throw new NotFoundError('Prescription record not found');

        const apptIdForAuth = this.resolveMongoId(prescription.appointmentId.toString());
        await this.assertPrescriptionAccess(apptIdForAuth, userId, role);

        let apptIdToUse = prescription.appointmentId.toString();
        if (apptIdToUse.includes('{') || apptIdToUse.includes('ObjectId')) {
            const apptIdMatch = apptIdToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
            if (apptIdMatch) apptIdToUse = apptIdMatch[1];
        }

        const apptQuery = mongoose.Types.ObjectId.isValid(apptIdToUse)
            ? { _id: new mongoose.Types.ObjectId(apptIdToUse) }
            : { _id: apptIdToUse };

        const appointment = await this._appointmentRepository.findWithDetails(apptQuery);
        let apptToUse;
        if (!appointment || appointment.length === 0) {
            apptToUse = await this._appointmentRepository.findById(apptIdToUse);
            if (!apptToUse) throw new NotFoundError('Appointment not found');
        } else {
            apptToUse = appointment[0];
        }

        const pdfBuffer = await this._pdfService.generatePrescriptionPdf(prescription, apptToUse);
        const apptDate = apptToUse.appointmentDate || apptToUse.createdAt || new Date();
        const dateStr = new Date(apptDate).toLocaleDateString('en-CA');
        return {
            data: pdfBuffer,
            filename: `Prescription-${dateStr}.pdf`
        };
    }
}
