import { IAppointmentService } from '../interfaces/IAppointmentService';
import { IAppointmentRepository } from '../../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { IPetRepository } from '../../repositories/interfaces/IPetRepository';
import { IPaymentService } from '../interfaces/IPaymentService';
import Slot from '../../models/slot.model';
import { IPrescriptionRepository } from '../../repositories/interfaces/IPrescriptionRepository';
import { INotificationService } from '../notification.service';
import { IAppointment, Appointment } from '../../models/appointment.model';
import { ISlot } from '../../models/slot.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import mongoose from 'mongoose';
import logger from '../../logger';
import { SocketService } from '../socket.service';
import cron from 'node-cron';
import { NotificationHelper } from '../../utils/notification-helper';
import { ServiceType } from '../../enums/service-type.enum';

export class AppointmentService implements IAppointmentService {

    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _petRepository: IPetRepository;
    private readonly _paymentService: IPaymentService;
    private readonly _prescriptionRepository: IPrescriptionRepository;
    private readonly _notificationService: INotificationService;

    constructor(
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        petRepository: IPetRepository,
        paymentService: IPaymentService,
        prescriptionRepository: IPrescriptionRepository,
        notificationService: INotificationService
    ) {
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._petRepository = petRepository;
        this._paymentService = paymentService;
        this._prescriptionRepository = prescriptionRepository;
        this._notificationService = notificationService;

        // Initialize Background Jobs
        this.initializeCronJobs();
    }

    private initializeCronJobs() {
        cron.schedule('* * * * *', async () => {
            logger.info('Running background job: autoCancelMissedAppointments and Reminders');
            try {
                await this.autoCancelMissedAppointments();
                await this.sendAppointmentReminders();
            } catch (err) {
                logger.error('Error in background cron jobs:', err);
            }
        });
    }

    private async sendAppointmentReminders() {
        try {
            const now = new Date();
            const reminderTime = new Date(now.getTime() + 5 * 60 * 1000);
            
            const startH = reminderTime.getHours().toString().padStart(2, '0');
            const startM = reminderTime.getMinutes().toString().padStart(2, '0');
            const timeStr = `${startH}:${startM}`;

            const appointments = await (this._appointmentRepository as any).model.find({
                appointmentDate: {
                    $gte: new Date(reminderTime.getFullYear(), reminderTime.getMonth(), reminderTime.getDate()),
                    $lt: new Date(reminderTime.getFullYear(), reminderTime.getMonth(), reminderTime.getDate() + 1)
                },
                appointmentStartTime: timeStr,
                status: { $in: [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED] }
            }).populate('petId').populate('doctorId');

            for (const appt of appointments) {
                const pet = appt.petId as any;
                const doctor = appt.doctorId as any;
                if (pet && doctor) {
                    await NotificationHelper.notifyAppointmentReminder(
                        this.extractId(appt.ownerId),
                        this.extractId(doctor.userId),
                        pet.name,
                        appt.appointmentStartTime,
                        appt._id.toString()
                    );
                }
            }
        } catch (error) {
            logger.error('Error in sendAppointmentReminders:', error);
        }
    }

    private extractId(value: any): string {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value instanceof mongoose.Types.ObjectId) return value.toString();
        if (typeof value === 'object' && value._id) return value._id.toString();
        return value.toString();
    }

    async createAppointment(data: any): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByIdWithDetails(data.doctorId);
            if (!doctor) throw new Error('Doctor not found');

            if (!doctor.isActive || !doctor.isVerified || doctor.profileStatus !== 'verified') {
                throw new Error('Doctor is not currently available for appointments');
            }

            const doctorUser = doctor.userId as any;
            if (doctorUser && doctorUser.isBlocked) {
                throw new Error('Doctor is currently unavailable');
            }

            const pet = await this._petRepository.findById(data.petId);
            if (!pet) throw new Error('Pet not found');
            if (!pet.isActive) {
                throw new Error('Pet is not active');
            }

            const slot = await Slot.findById(data.slotId).session(session);
            if (!slot || slot.isBooked || slot.isBlocked) {
                throw new Error('Slot is no longer available');
            }

           
            const appointmentDate = new Date(data.appointmentDate);
            const now = new Date();

            const appDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
            const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (appDateOnly < todayDateOnly) {
                throw new Error('Cannot book an appointment in the past');
            }

            if (appDateOnly.getTime() === todayDateOnly.getTime()) {
                const [startHour, startMin] = slot.startTime.split(':').map(Number);
                const slotStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin);

                if (slotStartTime < now) {
                    throw new Error('This slot has already passed for today');
                }
            }

            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            const appointmentId = `API${randomDigits}`;

            const appointment = await this._appointmentRepository.create({
                ...data,
                appointmentId,
                status: (data.paymentMethod === 'razorpay' || data.paymentMethod === 'wallet') ? AppointmentStatus.PAYMENT_PENDING : AppointmentStatus.BOOKED
            });

            if (data.paymentMethod === 'cod' || data.paymentMethod === 'cash') {
                slot.isBooked = true;
                slot.status = 'booked';
                await slot.save({ session });
            }

            await session.commitTransaction();

            if (appointment.status === AppointmentStatus.BOOKED) {
                try {
                    const doctor = await this._doctorRepository.findById(data.doctorId);
                    if (doctor) {
                        const pet = await this._petRepository.findById(data.petId);
                        await NotificationHelper.notifyAppointmentBooked(
                            this.extractId(appointment.ownerId),
                            this.extractId(doctor._id),
                            this.extractId(doctor.userId),
                            pet?.name || 'a pet',
                            new Date(data.appointmentDate).toLocaleDateString(),
                            data.appointmentStartTime,
                            appointment._id.toString()
                        );
                    }
                } catch (notiError) {
                    logger.error('Error creating notification for new appointment', { notiError });
                }
            }

            return { success: true, data: appointment };
        } catch (error: any) {
            await session.abortTransaction();
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async getAppointmentsByOwner(ownerId: string, page: number, limit: number, search?: string, status?: string, timeframe?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }> {
        try {
            const query: any = { ownerId };
            if (status) query.status = status;

            if (timeframe && timeframe !== 'Lifetime') {
                const now = new Date();
                let startDate = new Date();

                if (timeframe === 'Today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (timeframe === 'This Week') {
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
                    startDate.setHours(0, 0, 0, 0);
                } else if (timeframe === 'This Month') {
                    startDate.setFullYear(now.getFullYear(), now.getMonth(), 1);
                    startDate.setHours(0, 0, 0, 0);
                }

                query.appointmentDate = { $gte: startDate };
            }

            if (search) {
                query.$or = [
                    { 'appointmentId': { $regex: search, $options: 'i' } },
                    { 'serviceType': { $regex: search, $options: 'i' } }
                ];
            }
            const { appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
            return { success: true, data: appointments, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getAppointmentsByDoctor(userId: string, status?: string, page = 1, limit = 10, search?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }> {
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) {
                return { success: true, data: [], total: 0, message: 'Doctor profile not found for this user.' };
            }

            const query: any = { doctorId: doctor._id };
            if (status) query.status = status;

            if (search) {
                query.$or = [
                    { 'appointmentId': { $regex: search, $options: 'i' } },
                    { 'serviceType': { $regex: search, $options: 'i' } }
                ];

                const matchingPetIds = await this._petRepository.findIdsByName(search);
                if (matchingPetIds.length > 0) {
                    query.$or.push({ petId: { $in: matchingPetIds } });
                }
            }

            const { appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
            return { success: true, data: appointments, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getAllAppointments(page: number, limit: number, search?: string, status?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }> {
        try {
            const query: any = {};
            if (status) query.status = status;
            if (search) {
                const doctorUserIds = await (this._doctorRepository as any)._model.db.model('User').find({
                    username: { $regex: search, $options: 'i' }
                }).select('_id');

                const doctors = await (this._doctorRepository as any)._model.find({
                    userId: { $in: doctorUserIds.map((u: any) => u._id) }
                }).select('_id');

                query.$or = [
                    { 'appointmentId': { $regex: search, $options: 'i' } },
                    { 'serviceType': { $regex: search, $options: 'i' } },
                    { 'doctorId': { $in: doctors.map((d: any) => d._id) } }
                ];
            }
            const { appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
            return { success: true, data: appointments, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, userId: string): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            if (!appointment.appointmentId) {
                const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
                appointment.appointmentId = `API${randomDigits}`;
            }

            if (status === AppointmentStatus.CONFIRMED) {
                const doctor = await this._doctorRepository.findByUserId(userId);
                const appointmentDoctorId = this.extractId(appointment.doctorId);
                const doctorProfileId = doctor ? doctor._id.toString() : '';
                const doctorUserId = doctor ? this.extractId(doctor.userId) : '';
                const populatedDoctorUserId = this.extractId((appointment.doctorId as any)?.userId);
                const appointmentDoctorProfile = appointmentDoctorId
                    ? await this._doctorRepository.findById(appointmentDoctorId)
                    : null;
                const appointmentDoctorUserId = appointmentDoctorProfile
                    ? this.extractId(appointmentDoctorProfile.userId)
                    : populatedDoctorUserId;
                const isAuthorizedDoctor = !!doctor && (
                    appointmentDoctorId === doctorProfileId ||
                    appointmentDoctorId === doctorUserId
                ) || (!!appointmentDoctorUserId && appointmentDoctorUserId === userId);
                if (!isAuthorizedDoctor) {
                    throw new Error('Unauthorized');
                }
            }

            appointment.status = status;
            await appointment.save();

            if (status === AppointmentStatus.CANCELLED) {
                await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false, status: 'available' });

                
                if (appointment.paymentStatus === 'PAID') {
                    await this._paymentService.refund(appointment._id.toString(), 'Appointment cancelled by doctor');
                }
            }

            try {
                const pet = await this._petRepository.findById(this.extractId(appointment.petId));
                const doctor = await this._doctorRepository.findById(this.extractId(appointment.doctorId));
                const doctorUser = doctor?.userId as any;
                const doctorName = doctorUser?.username || 'Doctor';
                const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();

                if (status === AppointmentStatus.CONFIRMED) {
                    await NotificationHelper.notifyAppointmentConfirmed(
                        this.extractId(appointment.ownerId),
                        this.extractId(doctor?.userId),
                        pet?.name || 'pet',
                        doctorName,
                        dateStr,
                        appointment.appointmentStartTime,
                        appointment._id.toString()
                    );
                } else if (status === AppointmentStatus.COMPLETED) {
                    await NotificationHelper.notifyAppointmentCompleted(
                        this.extractId(appointment.ownerId),
                        this.extractId(doctor?.userId),
                        pet?.name || 'pet',
                        doctorName,
                        appointment._id.toString()
                    );
                } else if (status === AppointmentStatus.CANCELLED) {
                    await NotificationHelper.notifyAppointmentCancelled(
                        this.extractId(appointment.ownerId),
                        this.extractId(doctor?.userId),
                        pet?.name || 'pet',
                        dateStr,
                        'Status updated to cancelled',
                        appointment._id.toString(),
                        'doctor' // Assuming status update to cancelled is usually by doctor/admin
                    );
                }
            } catch (notiError) {
                logger.error('Error creating notifications for status update', { notiError });
            }

            return { success: true, data: appointment };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async cancelAppointment(appointmentId: string, userId: string, reason: string, providedSession?: any): Promise<{ success: boolean; message: string }> {
        const session = providedSession || await mongoose.startSession();
        const isInternalSession = !providedSession;

        if (isInternalSession) {
            session.startTransaction();
        }

        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
                throw new Error('Cannot cancel this appointment');
            }

            const now = new Date();
            const [startH, startM] = appointment.appointmentStartTime.split(':').map(Number);
            const apptStart = new Date(appointment.appointmentDate);
            apptStart.setHours(startH, startM, 0, 0);

            const graceEnd = new Date(apptStart.getTime() + 5 * 60 * 1000);
            const doctor = await this._doctorRepository.findByUserId(userId);
            const appointmentDoctorId = this.extractId(appointment.doctorId);
            const doctorProfileId = doctor ? doctor._id.toString() : '';
            const doctorUserId = doctor ? this.extractId(doctor.userId) : '';
            const populatedDoctorUserId = this.extractId((appointment.doctorId as any)?.userId);
            const appointmentDoctorProfile = appointmentDoctorId
                ? await this._doctorRepository.findById(appointmentDoctorId)
                : null;
            const appointmentDoctorUserId = appointmentDoctorProfile
                ? this.extractId(appointmentDoctorProfile.userId)
                : populatedDoctorUserId;
            const userIsDoctor = (!!doctor && (
                appointmentDoctorId === doctorProfileId ||
                appointmentDoctorId === doctorUserId
            )) || (!!appointmentDoctorUserId && appointmentDoctorUserId === userId);

            let shouldRefund = false;
            let finalReason = reason;

            if (now < apptStart) {
                shouldRefund = true;
                finalReason = `${userIsDoctor ? 'Doctor early cancellation' : 'Owner early cancellation'} - ${reason}`;
            }

            else if (now >= apptStart && now <= graceEnd) {
                if (userIsDoctor) {

                    shouldRefund = true;
                    finalReason = `cancellation by doctor side - ${reason}`;
                } else {

                    shouldRefund = false;
                    const doctorCheckedIn = !!appointment.checkIn?.vetCheckInTime;
                    finalReason = `${doctorCheckedIn
                        ? 'cancelled by owner during appointment time after doctor checkin'
                        : 'cancelled by owner during appointment time before doctor checkin'} - ${reason}`;
                }
            }

            else {
                if (appointment.status === AppointmentStatus.ONGOING) {
                    throw new Error('No cancellation available for this situation - Appointment is already ongoing.');
                }
            }

            let refundTriggered = false;
            if (shouldRefund && appointment.paymentStatus === 'PAID' && appointment.paymentMethod !== 'cod') {
                const refundResult = await this._paymentService.refund(appointment._id.toString(), finalReason, session);
                if (!refundResult.success) {
                    throw new Error(`Refund failed: ${refundResult.message}`);
                }
                refundTriggered = true;
            }


            await Appointment.findByIdAndUpdate(appointmentId, {
                status: AppointmentStatus.CANCELLED,
                cancellation: {
                    cancelledBy: new mongoose.Types.ObjectId(userId),
                    cancelReason: finalReason,
                    cancelledAt: now
                },
                ...(refundTriggered ? { paymentStatus: 'REFUNDED' } : {})
            }, { session });

            if (appointment.slotId) {
                await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false, status: 'available' }, { session });
            }

            if (isInternalSession) {
                await session.commitTransaction();
            }

            // Notify parties
            try {
                const pet = await this._petRepository.findById(this.extractId(appointment.petId));
                const doctorProfile = await this._doctorRepository.findById(this.extractId(appointment.doctorId));
                const doctorUserId = doctorProfile ? this.extractId(doctorProfile.userId) : '';
                const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();

                // Identify who cancelled
                const isDoctor = userId === doctorUserId || userId === doctorProfile?._id.toString();

                await NotificationHelper.notifyAppointmentCancelled(
                    this.extractId(appointment.ownerId),
                    doctorUserId,
                    pet?.name || 'pet',
                    dateStr,
                    finalReason,
                    appointment._id.toString(),
                    isDoctor ? 'doctor' : 'owner'
                );
            } catch (notiErr) {
                logger.error('Error sending cancellation notification', notiErr);
            }

            return { success: true, message: 'Appointment cancelled successfully' };
        } catch (error: any) {
            if (isInternalSession) {
                await session.abortTransaction();
            }
            return { success: false, message: error.message };
        } finally {
            if (isInternalSession) {
                session.endSession();
            }
        }
    }


    async getAvailableSlots(doctorId: string, date: any): Promise<{ success: boolean; data?: ISlot[]; message?: string }> {
        try {
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);

          
            const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            
            const searchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000)); 
            const searchEnd = new Date(startOfDay.getTime() + (30 * 60 * 60 * 1000));

            const requestedDate = new Date(y, m - 1, d);

            logger.info(`[AppointmentService] Fetching slots for Doctor: ${doctorId} on Date: ${dateStr}. Search range: ${searchStart.toISOString()} - ${searchEnd.toISOString()}`);

            const doctor = await this._doctorRepository.findById(doctorId);
            if (!doctor) throw new Error('Doctor not found');


            if (doctor.recurringSchedules && doctor.recurringSchedules.length > 0) {
                const schedule = doctor.recurringSchedules[0];
                const dtstart = new Date(schedule.dtstart);
                dtstart.setHours(0, 0, 0, 0);

                const reqDate = new Date(y, m - 1, d);
                reqDate.setHours(0, 0, 0, 0);

                if (reqDate < dtstart) {
                    logger.info(`[AppointmentService] Requested date ${dateStr} precedes doctor start date ${schedule.dtstart}`);
                    return { success: true, data: [], message: 'Date precedes doctor availability start date' };
                }

                if (schedule.dtend) {
                    const dtend = new Date(schedule.dtend);
                    dtend.setHours(23, 59, 59, 999);

                    if (reqDate > dtend) {
                        logger.info(`[AppointmentService] Requested date ${dateStr} is after doctor end date ${schedule.dtend}`);
                        return {
                            success: true,
                            data: [],
                            message: `Doctor availability ended on ${dtend.toLocaleDateString('en-GB')}`
                        };
                    }
                }
            }


            const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
            const businessDay = doctor.businessHours.find(bh => bh.day === dayOfWeek);

            if (businessDay && !businessDay.isWorking) {
                logger.info(`[AppointmentService] Doctor is not working on ${dayOfWeek}`);
                return { success: true, data: [], message: 'Doctor is not working on this day' };
            }


            let allSlots = await Slot.find({
                vetId: doctor._id,
                date: { $gte: searchStart, $lte: searchEnd }
            }).sort({ startTime: 1 });

          
            let slots = allSlots.filter((s: any) => {
                const sDate = new Date(s.date);
                
                const diffHours = Math.abs(sDate.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
                return diffHours < 12; 
            });

            if (slots.length > 0) {
                logger.info(`[AppointmentService] Found ${slots.length} relevant slots (out of ${allSlots.length} in range).`);

                const availableSlots = slots.filter(s => {
                    if (s.isBooked || s.isBlocked) {
                        logger.debug(`Filtering out slot ${s.startTime}: booked=${s.isBooked}, blocked=${s.isBlocked}`);
                        return false;
                    }
                    return true;
                });

                return { success: true, data: availableSlots };
            }


            logger.info(`[AppointmentService] No slots found for ${dateStr}. Starting generation...`);

            const PLATFORM_BUFFER = 10;
            const newSlotsData = [];

            if (businessDay && businessDay.isWorking) {
                const occDuration = parseInt(businessDay.duration) || doctor.appointmentDuration || 30;
                const occCycleTime = occDuration + PLATFORM_BUFFER;

               
                if (businessDay.slots && businessDay.slots.length > 0) {
                    logger.info(`[AppointmentService] Generating slots from custom businessDay.slots array (${businessDay.slots.length} slots)`);
                    for (const sTime of businessDay.slots) {
                        const [h, m] = sTime.split(':').map(Number);
                        const startTotalMinutes = h * 60 + m;
                        const endTotalMinutes = startTotalMinutes + occDuration;

                        const nextH = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
                        const nextM = (endTotalMinutes % 60).toString().padStart(2, '0');
                        const endTime = `${nextH}:${nextM}`;

                        newSlotsData.push({
                            vetId: doctor._id,
                            date: new Date(startOfDay),
                            startTime: sTime,
                            endTime: endTime,
                            isBooked: false,
                            isBlocked: false,
                            status: 'available' as any
                        });
                    }
                } else {
                    
                    logger.info(`[AppointmentService] Generating slots using time-range loop (${businessDay.startTime} - ${businessDay.endTime})`);
                    const occStartTime = businessDay.startTime || "09:00";
                    const occEndTime = businessDay.endTime || "17:00";

                    const [startH, startM] = occStartTime.split(':').map(Number);
                    const [endH, endM] = occEndTime.split(':').map(Number);

                    let currentTotalMinutes = startH * 60 + startM;
                    const endTotalLimit = endH * 60 + endM;

                    while (currentTotalMinutes + occDuration <= endTotalLimit) {
                        const h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
                        const m = (currentTotalMinutes % 60).toString().padStart(2, '0');
                        const startTime = `${h}:${m}`;

                        const endTimeTotal = currentTotalMinutes + occDuration;
                        const nextH = Math.floor(endTimeTotal / 60).toString().padStart(2, '0');
                        const nextM = (endTimeTotal % 60).toString().padStart(2, '0');
                        const endTime = `${nextH}:${nextM}`;

                        newSlotsData.push({
                            vetId: doctor._id,
                            date: new Date(startOfDay),
                            startTime,
                            endTime,
                            isBooked: false,
                            isBlocked: false,
                            status: 'available' as any
                        });

                        currentTotalMinutes += occCycleTime;
                    }
                }
            }

            
            if (newSlotsData.length === 0 && doctor.recurringSchedules && doctor.recurringSchedules.length > 0) {
                logger.info(`[AppointmentService] Falling back to recurring schedules for generation`);
                const { rrulestr } = require('rrule');

                for (const schedule of doctor.recurringSchedules) {
                    if (!schedule.isWorking) continue;

                    const rule = rrulestr(schedule.rrule, { dtstart: schedule.dtstart });
                    const occurrences = rule.between(searchStart, searchEnd);

                    if (occurrences.length > 0) {
                        for (const occurrence of occurrences) {
                            const occDayOfWeek = occurrence.toLocaleDateString('en-US', { weekday: 'long' });
                            const occBusinessDay = doctor.businessHours.find(bh => bh.day === occDayOfWeek);

                            if (occBusinessDay && occBusinessDay.isWorking) {
                                const occDuration = parseInt(occBusinessDay.duration) || doctor.appointmentDuration || 30;
                                const occCycleTime = occDuration + PLATFORM_BUFFER;
                                const occStartTime = occBusinessDay.startTime || schedule.startTime || "09:00";
                                const occEndTime = occBusinessDay.endTime || schedule.endTime || "17:00";

                                const [startH, startM] = occStartTime.split(':').map(Number);
                                const [endH, endM] = occEndTime.split(':').map(Number);

                                let currentTotalMinutes = startH * 60 + startM;
                                const endTotalLimit = endH * 60 + endM;

                                const occDate = new Date(occurrence);
                                occDate.setHours(0, 0, 0, 0);

                                while (currentTotalMinutes + occDuration <= endTotalLimit) {
                                    const h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
                                    const m = (currentTotalMinutes % 60).toString().padStart(2, '0');
                                    const startTime = `${h}:${m}`;

                                    const endTimeTotal = currentTotalMinutes + occDuration;
                                    const nextH = Math.floor(endTimeTotal / 60).toString().padStart(2, '0');
                                    const nextM = (endTimeTotal % 60).toString().padStart(2, '0');
                                    const endTime = `${nextH}:${nextM}`;

                                    newSlotsData.push({
                                        vetId: doctor._id,
                                        date: occDate,
                                        startTime,
                                        endTime,
                                        isBooked: false,
                                        isBlocked: false,
                                        status: 'available' as any
                                    });

                                    currentTotalMinutes += occCycleTime;
                                }
                            }
                        }
                    }
                }
            }

            if (newSlotsData.length > 0) {
                logger.info(`[AppointmentService] Inserting ${newSlotsData.length} newly generated slots into database`);
                slots = await Slot.insertMany(newSlotsData);
            } else {
                logger.info(`[AppointmentService] No slots could be generated for ${dateStr}`);
            }

            const availableSlots = slots.filter(s => !s.isBooked && !s.isBlocked);
            return { success: true, data: availableSlots };
        } catch (error: any) {
            logger.error(`[AppointmentService] Error in getAvailableSlots:`, error);
            return { success: false, message: error.message };
        }
    }

    async autoCancelMissedAppointments(): Promise<{ success: boolean; cancelledCount: number }> {
        try {
            const GRACE_PERIOD = 5;
            const now = new Date();





            const pendingAppointments = await (this._appointmentRepository as any).model.find({
                status: { $in: ['booked', 'confirmed', 'BOOKED'] }
            }).populate('slotId');

            let cancelledCount = 0;


            for (const appt of pendingAppointments) {
                const [startH, startM] = appt.appointmentStartTime.split(':').map(Number);
                const apptStart = new Date(appt.appointmentDate);
                apptStart.setHours(startH, startM, 0, 0);

                const graceEnd = new Date(apptStart.getTime() + GRACE_PERIOD * 60 * 1000);

                if (now > graceEnd) {
                    const hasOwnerCheckedIn = !!appt.checkIn?.ownerCheckInTime;
                    const hasDoctorCheckedIn = !!appt.checkIn?.vetCheckInTime;

                    if (!hasOwnerCheckedIn || !hasDoctorCheckedIn) {
                        let shouldRefund = false;
                        let cancelReason = '';

                        if (!hasOwnerCheckedIn && !hasDoctorCheckedIn) {
                            // Scenario 3: Both forgot
                            shouldRefund = false;
                            cancelReason = 'Missed appointment: both forgot to checkin (no refund)';
                        } else if (hasOwnerCheckedIn && !hasDoctorCheckedIn) {
                            // Scenario 4: Doctor missed
                            shouldRefund = true;
                            cancelReason = 'Doctor did not checkin';
                        } else if (!hasOwnerCheckedIn && hasDoctorCheckedIn) {
                            // Scenario 5: Owner missed
                            shouldRefund = false;
                            cancelReason = 'Owner did not checkin';
                        }

                        appt.status = AppointmentStatus.CANCELLED;
                        appt.cancellation = {
                            cancelledBy: null as any,
                            cancelReason: cancelReason,
                            cancelledAt: new Date()
                        };
                        await appt.save();

                        
                        if (shouldRefund && appt.paymentStatus === 'PAID' && appt.paymentMethod !== 'cod') {
                            try {
                                await this._paymentService.refund(appt._id.toString(), cancelReason);
                            } catch (error) {
                                logger.error('Auto-refund failed:', error);
                            }
                        }

                        if (appt.slotId) {
                            await Slot.findByIdAndUpdate(appt.slotId._id, { status: 'available', isBooked: false });
                        }

                        
                        if (SocketService.io) {
                            SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                                status: AppointmentStatus.CANCELLED,
                                reason: cancelReason
                            });
                        }

                        cancelledCount++;
                    }
                }
            }

            
            const activeAppointments = await (this._appointmentRepository as any).model.find({
                status: AppointmentStatus.ONGOING
            }).populate('slotId');

            for (const appt of activeAppointments) {
                const [endH, endM] = appt.appointmentEndTime.split(':').map(Number);
                const apptEnd = new Date(appt.appointmentDate);
                apptEnd.setHours(endH, endM, 0, 0);

                // Scenario 11: Auto checkout after slot time
                if (now > apptEnd) {
                    
                    appt.checkOut = {
                        ownerCheckOutTime: appt.checkOut?.ownerCheckOutTime || apptEnd,
                        vetCheckOutTime: appt.checkOut?.vetCheckOutTime || apptEnd
                    };

                    appt.status = AppointmentStatus.COMPLETED;

                    
                    if ((appt.paymentMethod === 'cod' || appt.paymentMethod === 'cash') && appt.paymentStatus === 'PENDING') {
                        appt.paymentStatus = 'PAID';
                    }

                    await appt.save();

                    
                    const doc: any = await (this._appointmentRepository as any).model.db.model('Doctor').findById(appt.doctorId).populate('userId');
                    if (doc && doc.userId) {
                        await this._paymentService.creditDoctorWallet(
                            doc.userId._id.toString(),
                            appt.totalAmount,
                            appt._id.toString(),
                            appt.appointmentId || appt._id.toString().slice(-8).toUpperCase()
                        );
                    }

                    if (SocketService.io) {
                        SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                            status: appt.status,
                            checkOut: appt.checkOut
                        });
                    }
                }
            }

            return { success: true, cancelledCount };
        } catch (error: any) {
            console.error('Error in auto-cancellation:', error);
            return { success: false, cancelledCount: 0 };
        }
    }

    async getAppointmentById(id: string): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findWithDetails({ _id: id });
            if (!appointment || appointment.length === 0) {
                return { success: false, message: 'Appointment not found' };
            }
            return { success: true, data: appointment[0] };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async checkIn(appointmentId: string, role: 'owner' | 'doctor'): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findWithDetails({ _id: appointmentId });
            if (!appointment || appointment.length === 0) throw new Error('Appointment not found');
            const appt = appointment[0];

            const now = new Date();
            const [startHour, startMin] = appt.appointmentStartTime.split(':').map(Number);
            const apptStart = new Date(appt.appointmentDate);
            apptStart.setHours(startHour, startMin, 0, 0);

            const graceEnd = new Date(apptStart.getTime() + 5 * 60 * 1000);

           
            if (now < apptStart) {
                
                throw new Error('Appointment has not started yet');
            }

           
            if (now > graceEnd) {
                const hasOwnerCheckedIn = !!appt.checkIn?.ownerCheckInTime;
                const hasDoctorCheckedIn = !!appt.checkIn?.vetCheckInTime;

                let shouldRefund = false;
                let cancelReason = '';

                if (!hasOwnerCheckedIn && !hasDoctorCheckedIn) {
                    // Both failed to check in
                    shouldRefund = true;
                    cancelReason = 'Consultation cancelled: Both parties failed to check in within grace period.';
                } else if (role === 'doctor' && hasOwnerCheckedIn) {
                    // Doctor is late, owner already checked in
                    shouldRefund = true;
                    cancelReason = 'Consultation cancelled: Doctor failed to check in within grace period.';
                } else if (role === 'owner' && hasDoctorCheckedIn) {
                    // Owner is late, doctor already checked in
                    shouldRefund = false;
                    cancelReason = 'Consultation cancelled: Owner failed to check in within grace period (No refund applicable).';
                } else {
                    // Default fallback
                    shouldRefund = !hasDoctorCheckedIn;
                    cancelReason = !hasDoctorCheckedIn
                        ? 'Consultation cancelled: Both parties failed to check in within grace period.'
                        : 'Consultation cancelled: Owner failed to check in within grace period (No refund applicable).';
                }

                // Auto cancel if too late
                appt.status = AppointmentStatus.CANCELLED;
                appt.cancellation = {
                    cancelledBy: null as any,
                    cancelReason: cancelReason,
                    cancelledAt: new Date()
                };
                await appt.save();

                
                if (appt.slotId) {
                    await Slot.findByIdAndUpdate(appt.slotId, {
                        isBooked: false,
                        status: 'available'
                    });
                }

           
                if (shouldRefund && appt.paymentStatus === 'PAID') {
                    try {
                        await this._paymentService.refund(appt._id.toString(), cancelReason);
                    } catch (refundError) {
                        logger.error('Failed to trigger automatic refund during late check-in:', refundError);
                    }
                }

                throw new Error(cancelReason);
            }

           
            if (role === 'doctor') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const previousAppointments = await Appointment.find({
                    doctorId: appt.doctorId,
                    appointmentDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
                    
                    $or: [
                        { status: AppointmentStatus.COMPLETED, prescriptionId: { $exists: false } },
                        {
                            status: AppointmentStatus.CONFIRMED,
                            'checkOut.vetCheckOutTime': { $exists: true },
                            prescriptionId: { $exists: false }
                        }
                    ]
                });

                if (previousAppointments.length > 0) {
                    throw new Error('You have pending prescriptions for a previous completed or checked-out slot today. Please fill them before starting the next consultation.');
                }
            }

            if (role === 'owner') {
                appt.checkIn = {
                    ...(appt.checkIn || {}),
                    ownerCheckInTime: now
                };
            } else {
                appt.checkIn = {
                    ...(appt.checkIn || {}),
                    vetCheckInTime: now
                };
            }

            // Set status to ONGOING only if BOTH parties have checked in
            if (appt.checkIn?.ownerCheckInTime && appt.checkIn?.vetCheckInTime) {
                if (appt.status === AppointmentStatus.CONFIRMED || appt.status === AppointmentStatus.BOOKED) {
                    appt.status = AppointmentStatus.ONGOING;
                }
            }

            appt.markModified('checkIn');
            await appt.save();

            // Notify via socket
            if (SocketService.io) {
                SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                    status: appt.status,
                    checkIn: appt.checkIn
                });
            }

            return { success: true, data: appt };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async checkOut(appointmentId: string, role: 'owner' | 'doctor'): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findWithDetails({ _id: appointmentId });
            if (!appointment || appointment.length === 0) throw new Error('Appointment not found');
            const appt = appointment[0];

            const now = new Date();
            const [endHour, endMin] = appt.appointmentEndTime.split(':').map(Number);
            const apptEnd = new Date(appt.appointmentDate);
            apptEnd.setHours(endHour, endMin, 0, 0);

            const manualCheckOutStart = new Date(apptEnd.getTime() - 5 * 60 * 1000);

           
            if (now < manualCheckOutStart) {
                throw new Error('Cannot checkout early. Please attend at least 25 minutes of the consultation.');
            }

            if (role === 'owner') {
                appt.checkOut = {
                    ...(appt.checkOut || {}),
                    ownerCheckOutTime: now
                };
            } else {
                appt.checkOut = {
                    ...(appt.checkOut || {}),
                    vetCheckOutTime: now
                };
                appt.status = AppointmentStatus.COMPLETED;

              
                const doc: any = await (this._appointmentRepository as any).model.db.model('Doctor').findById(appt.doctorId).populate('userId');
                if (doc && doc.userId) {
                    await this._paymentService.creditDoctorWallet(
                        doc.userId._id.toString(),
                        appt.totalAmount,
                        appt._id.toString(),
                        appt.appointmentId || appt._id.toString().slice(-8).toUpperCase()
                    );
                }

                
                logger.info(`Manual-checkout diagnostic for ${appt.appointmentId}: method=${appt.paymentMethod}, paymentStatus=${appt.paymentStatus}`);

                
                if ((appt.paymentMethod === 'cod' || appt.paymentMethod === 'cash') && appt.paymentStatus === 'PENDING') {
                    appt.paymentStatus = 'PAID';
                    logger.info(`Manually completed COD appointment ${appt.appointmentId}: Payment marked as PAID`);
                }

                // Trigger formal notification
                try {
                    const doc: any = await (this._appointmentRepository as any).model.db.model('Doctor').findById(appt.doctorId).populate('userId');
                    const doctorName = doc?.userId?.username || 'Doctor';
                    const doctorUserId = doc?.userId?._id?.toString() || doc?.userId?.toString();
                    
                    await NotificationHelper.notifyAppointmentCompleted(
                        this.extractId(appt.ownerId),
                        doctorUserId,
                        (appt.petId as any)?.name || 'pet',
                        doctorName,
                        appt._id.toString()
                    );
                } catch (notiErr) {
                    logger.error('Error sending completion notification in checkOut:', notiErr);
                }
            }
            appt.markModified('checkOut');
            await appt.save();

            // Notify via socket
            if (SocketService.io) {
                SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                    status: appt.status,
                    checkOut: appt.checkOut
                });
            }

            return { success: true, data: appt };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getPatientsByDoctor(userId: string, page: number, limit: number, search?: string, species?: string, date?: string): Promise<{ success: boolean; data?: any[]; total?: number; message?: string }> {
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new Error('Doctor not found');

            const doctorId = doctor._id;
            const matchQuery: any = { doctorId: new mongoose.Types.ObjectId(doctorId.toString()) };

            if (date) {
                const searchDate = new Date(date);
                const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
                matchQuery.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
            }

            const aggregation: any[] = [
                { $match: matchQuery },
                {
                    $group: {
                        _id: { petId: "$petId" },
                        ownerId: { $first: "$ownerId" },
                        lastAppointmentDate: { $max: "$appointmentDate" }
                    }
                },
                {
                    $lookup: {
                        from: 'pets',
                        localField: '_id.petId',
                        foreignField: '_id',
                        as: 'pet'
                    }
                },
                { $unwind: "$pet" },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                { $unwind: "$owner" }
            ];

            if (species) {
                aggregation.push({
                    $match: { "pet.species": { $regex: species, $options: 'i' } }
                });
            }

            if (search) {
                aggregation.push({
                    $match: {
                        $or: [
                            { "pet.name": { $regex: search, $options: 'i' } },
                            { "owner.username": { $regex: search, $options: 'i' } }
                        ]
                    }
                });
            }

            const totalResult = await (this._appointmentRepository as any).model.aggregate([
                ...aggregation,
                { $count: "total" }
            ]);
            const total = totalResult.length > 0 ? totalResult[0].total : 0;

            aggregation.push(
                { $sort: { lastAppointmentDate: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit }
            );

            const patients = await (this._appointmentRepository as any).model.aggregate(aggregation);

            const formattedPatients = patients.map((p: any) => ({
                id: p._id.petId,
                name: p.pet.name,
                species: p.pet.species,
                breed: p.pet.breed,
                gender: p.pet.gender,
                dob: p.pet.dob,
                ownerName: p.owner.username,
                ownerEmail: p.owner.email,
                lastAppointmentDate: p.lastAppointmentDate,
                picture: p.pet.picture
            }));

            return { success: true, data: formattedPatients, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getDoctorStats(doctorId: string): Promise<{ success: boolean; stats?: any; message?: string }> {
        try {
            const [booked, confirmed, ongoing, cancelled, completed, requests] = await Promise.all([
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.BOOKED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CONFIRMED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.ONGOING }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCELLED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.COMPLETED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCEL_REQUEST })
            ]);

            return {
                success: true,
                stats: {
                    booked,
                    confirmed,
                    ongoing,
                    cancelled,
                    completed,
                    requests,
                    upcoming: booked + confirmed
                }
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getOwnerStats(ownerId: string): Promise<{ success: boolean; stats?: any; message?: string }> {
        try {
            const [booked, confirmed, ongoing, pending, cancelled, completed] = await Promise.all([
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.BOOKED }),
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.CONFIRMED }),
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.ONGOING }),
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.PAYMENT_PENDING }),
                this._appointmentRepository.countDocuments({
                    ownerId,
                    status: { $in: [AppointmentStatus.CANCEL_REQUEST, AppointmentStatus.CANCELLED] }
                }),
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.COMPLETED })
            ]);

            return {
                success: true,
                stats: {
                    booked,
                    confirmed,
                    ongoing,
                    pending,
                    cancelled,
                    completed
                }
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    private async unlockSlot(slotId: string): Promise<void> {
        try {
            await Slot.findByIdAndUpdate(slotId, {
                isBooked: false,
                status: 'available'
            });
            logger.info('Slot unlocked successfully', { slotId });
        } catch (error: any) {
            logger.error('Failed to unlock slot', { slotId, error: error.message });
        }
    }

    async cancelPendingAppointment(appointmentId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) return { success: false, message: 'Appointment not found' };

            
            if (appointment.status !== AppointmentStatus.PAYMENT_PENDING) {
                return { success: false, message: 'Only pending appointments can be cancelled via this method' };
            }

            appointment.status = AppointmentStatus.CANCELLED;
            await appointment.save();

            if (appointment.slotId) {
                await this.unlockSlot(appointment.slotId.toString());
            }

            logger.info('Pending appointment cancelled and slot unlocked', { appointmentId });
            return { success: true, message: 'Appointment cancelled and slot released' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    private async confirmBooking(appointmentId: string, slotId: string, session: mongoose.ClientSession): Promise<void> {
        const slot = await Slot.findById(slotId).session(session);
        if (!slot || slot.isBooked) {
            throw new Error('Slot is no longer available');
        }

        slot.isBooked = true;
        slot.status = 'booked';
        await slot.save({ session });

        await Appointment.findByIdAndUpdate(appointmentId, {
            status: AppointmentStatus.BOOKED
        }, { session });

        logger.info('Appointment confirmed and slot locked', { appointmentId, slotId });
    }
    async checkSlotAvailability(id: string): Promise<{ success: boolean; available: boolean; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findById(id);
            if (!appointment) {
                logger.warn('checkSlotAvailability: Appointment not found', { id });
                throw new Error('Appointment not found');
            }

            const slot = await Slot.findById(appointment.slotId);
            if (!slot) {
                logger.warn('checkSlotAvailability: Slot record not found', { appointmentId: id, slotId: appointment.slotId });
                throw new Error('Slot record not found');
            }

            const isAvailable = !slot.isBooked && !slot.isBlocked;

            logger.info('checkSlotAvailability check:', {
                appointmentId: id,
                slotId: slot._id,
                isBooked: slot.isBooked,
                isBlocked: slot.isBlocked,
                isAvailable
            });

            return {
                success: true,
                available: isAvailable,
                message: isAvailable ? 'Slot is available' : 'Slot has already been taken'
            };
        } catch (error: any) {
            logger.error('Error checking slot availability:', { id, error: error.message });
            return { success: false, available: false, message: error.message };
        }
    }

    async getAllSlotsForDoctor(userId: string, date: any): Promise<{ success: boolean; data?: any[]; message?: string }> {
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new Error('Doctor profile not found');

            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            
            const searchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000)); 
            const searchEnd = new Date(startOfDay.getTime() + (30 * 60 * 60 * 1000));

            // Ensure slots exist for this day
            await this.getAvailableSlots(doctor._id.toString(), date);

            const slots = await Slot.find({
                vetId: doctor._id,
                date: { $gte: searchStart, $lte: searchEnd }
            }).sort({ startTime: 1 });

            const daySlots = slots.filter((s: any) => {
                const sDate = new Date(s.date);
                const diffHours = Math.abs(sDate.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
                return diffHours < 12;
            });

            const populatedSlots = await Promise.all(daySlots.map(async (slot) => {
                const slotObj = slot.toObject() as any;
                if (slot.isBooked) {
                    const appointment = await Appointment.findOne({ 
                        slotId: slot._id,
                        status: { $ne: AppointmentStatus.CANCELLED }
                    });
                    if (appointment) {
                        slotObj.mode = appointment.mode;
                        slotObj.appointmentId = appointment._id;
                        slotObj.status = 'Appointment';
                    } else {
                        slotObj.status = 'Booked';
                    }
                } else if (slot.isBlocked) {
                    slotObj.status = 'Blocked';
                } else if (slot.slotType === ServiceType.SUBSCRIPTION) { 
                     slotObj.status = 'Subscription';
                } else {
                    // Check for cancelled appointments to show in Red
                    const cancelledAppt = await Appointment.findOne({
                        slotId: slot._id,
                        status: AppointmentStatus.CANCELLED
                    });
                    if (cancelledAppt) {
                        slotObj.status = 'cancelled';
                    } else {
                        slotObj.status = 'Available';
                    }
                }
                return slotObj;
            }));

            return { success: true, data: populatedSlots };
        } catch (error: any) {
            logger.error(`[AppointmentService] Error in getAllSlotsForDoctor:`, error);
            return { success: false, message: error.message };
        }
    }
}
