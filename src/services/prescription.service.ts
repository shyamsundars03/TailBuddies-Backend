import { IPrescriptionService } from './interfaces/IPrescriptionService';
import { IPrescriptionRepository } from '../repositories/interfaces/IPrescriptionRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IPrescription } from '../models/prescription.model';
import { IPdfService } from './interfaces/IPdfService';
import { INotificationService } from './notification.service';
import mongoose from 'mongoose';
import logger from '../logger';

export class PrescriptionService implements IPrescriptionService {
    private readonly _prescriptionRepository: IPrescriptionRepository;
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _pdfService: IPdfService;
    private readonly _notificationService: INotificationService;

    constructor(
        prescriptionRepository: IPrescriptionRepository,
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        pdfService: IPdfService,
        notificationService: INotificationService
    ) {
        this._prescriptionRepository = prescriptionRepository;
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._pdfService = pdfService;
        this._notificationService = notificationService;
    }

    async createPrescription(data: any): Promise<{ success: boolean; data?: IPrescription; message?: string }> {
        try {
            
            const doctor = await this._doctorRepository.findByUserId(data.vetId);
            if (!doctor) throw new Error('Doctor profile not found for this user');

           
            let prescription = await this._prescriptionRepository.model.findOne({ appointmentId: data.appointmentId });

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
                    prescriptionId
                });
                logger.info(`Created new prescription ${prescription.prescriptionId} for appointment ${data.appointmentId}`);
            }

            
            await (this._appointmentRepository as any).model.findByIdAndUpdate(
                data.appointmentId,
                { prescriptionId: prescription._id.toString() }
            );

           
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

            return { success: true, data: prescription };
        } catch (error: any) {
            logger.error(`Error in createPrescription: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async getPrescriptionByAppointmentId(appointmentId: string): Promise<{ success: boolean; data?: IPrescription; message?: string }> {
        try {
            
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (appointment && appointment.prescriptionId) {
                
                if (typeof appointment.prescriptionId === 'object' && (appointment.prescriptionId as any).prescriptionId) {
                    return { success: true, data: appointment.prescriptionId as any };
                }

                
                let idToUse = appointment.prescriptionId.toString();
                if (idToUse.includes('{') || idToUse.includes('ObjectId')) {
                    const idMatch = idToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
                    if (idMatch) {
                        idToUse = idMatch[1];
                        logger.info(`Extracted ID ${idToUse} from corrupted prescriptionId string`);
                    }
                }
                
                
                const prescription = await this._prescriptionRepository.findById(idToUse);
                if (prescription) {
                    logger.info(`Fetched prescription ${prescription.prescriptionId} via appointment link for ${appointmentId}`);
                    return { success: true, data: prescription };
                }
            }

            
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
            let idToUse = id;
            if (idToUse.includes('{') || idToUse.includes('ObjectId')) {
                const idMatch = idToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
                if (idMatch) {
                    idToUse = idMatch[1];
                }
            }
            
            const model = (this._prescriptionRepository as any)._model;
            const query: any = {
                $or: [
                    { prescriptionId: idToUse }
                ]
            };

            if (mongoose.Types.ObjectId.isValid(idToUse)) {
                query.$or.push({ _id: new mongoose.Types.ObjectId(idToUse) });
                query.$or.push({ appointmentId: new mongoose.Types.ObjectId(idToUse) });
            } else {
                query.$or.push({ _id: idToUse as any });
                query.$or.push({ appointmentId: idToUse as any });
            }

            const prescription = await model.findOne(query)
                .populate({ path: 'vetId', populate: { path: 'userId' } })
                .populate('petId')
                .sort({ createdAt: -1 });

            if (!prescription) {
                return { success: false, message: `Prescription not found for ID: ${idToUse}` };
            }
            return { success: true, data: prescription };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async generatePrescriptionPdf(prescriptionId: string): Promise<{ success: boolean; data?: Buffer; message?: string }> {
        try {
            let idToUse = prescriptionId;
            if (idToUse.includes('{') || idToUse.includes('ObjectId')) {
                const idMatch = idToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
                if (idMatch) {
                    idToUse = idMatch[1];
                }
            }

            const model = (this._prescriptionRepository as any)._model;
            const query: any = {
                $or: [
                    { prescriptionId: idToUse }
                ]
            };

            if (mongoose.Types.ObjectId.isValid(idToUse)) {
                query.$or.push({ _id: new mongoose.Types.ObjectId(idToUse) });
                query.$or.push({ appointmentId: new mongoose.Types.ObjectId(idToUse) });
            } else {
                query.$or.push({ _id: idToUse as any });
                query.$or.push({ appointmentId: idToUse as any });
            }

            const prescription = await model.findOne(query);

            if (!prescription) {
                return { success: false, message: `Record not found for ID: ${idToUse}` };
            }

            let apptIdToUse = prescription.appointmentId.toString();
            if (apptIdToUse.includes('{') || apptIdToUse.includes('ObjectId')) {
                const apptIdMatch = apptIdToUse.match(/_id:\s*(?:new\s+ObjectId\()?['"]?([a-f\d]{24})['"]?/i);
                if (apptIdMatch) {
                    apptIdToUse = apptIdMatch[1];
                }
            }

            const apptQuery = mongoose.Types.ObjectId.isValid(apptIdToUse) 
                ? { _id: new mongoose.Types.ObjectId(apptIdToUse) }
                : { _id: apptIdToUse };

            const appointment = await this._appointmentRepository.findWithDetails(apptQuery);
            if (!appointment || appointment.length === 0) {
                const directAppt = await this._appointmentRepository.findById(apptIdToUse);
                if (directAppt) {
                    const pdfBuffer = await this._pdfService.generatePrescriptionPdf(prescription, directAppt);
                    return { success: true, data: pdfBuffer };
                }
                return { success: false, message: 'Appointment not found' };
            }

            const pdfBuffer = await this._pdfService.generatePrescriptionPdf(prescription, appointment[0]);
            return { success: true, data: pdfBuffer };
        } catch (error: any) {
            logger.error('Error in PrescriptionService.generatePrescriptionPdf', { error: error.message });
            return { success: false, message: error.message };
        }
    }
}
