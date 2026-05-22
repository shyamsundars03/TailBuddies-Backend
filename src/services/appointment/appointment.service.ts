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
import mongoose, { FilterQuery, PipelineStage } from 'mongoose';
import logger from '../../logger';
import { SocketService } from '../socket.service';
import cron from 'node-cron';
import { NotificationHelper } from '../../utils/notification-helper';
import { ServiceType } from '../../enums/service-type.enum';
import { AppError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../errors/app-error';
import { getErrorMessage } from '../../utils/service-error.util';
import { extractId } from '../../utils/mongoose-id.util';
import { asPopulatedDoctor, asPopulatedPet, asPopulatedUser } from '../../types/populated.types';
import { DoctorPatientAggregateRow, DoctorPatientListItem, DoctorCalendarSlot } from '../../types/appointment-service.types';
import { Doctor } from '../../models/doctor.model';
import { User } from '../../models/user.models';
import { HttpStatus } from '../../constants';
import { CreateAppointmentServiceInput } from '../../dto/appointment/appointment.schema';
import { DoctorAppointmentStatsDto, OwnerAppointmentStatsDto } from '../../dto/appointment/appointment-stats.dto';

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

    private get appointmentModel(): typeof Appointment {
        return this._appointmentRepository.model as typeof Appointment;
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

            const appointments = await this.appointmentModel.find({
                appointmentDate: {
                    $gte: new Date(reminderTime.getFullYear(), reminderTime.getMonth(), reminderTime.getDate()),
                    $lt: new Date(reminderTime.getFullYear(), reminderTime.getMonth(), reminderTime.getDate() + 1)
                },
                appointmentStartTime: timeStr,
                status: { $in: [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED] }
            }).populate('petId').populate('doctorId');

            for (const appt of appointments) {
                const pet = asPopulatedPet(appt.petId);
                const doctor = asPopulatedDoctor(appt.doctorId);
                if (pet && doctor) {
                    await NotificationHelper.notifyAppointmentReminder(
                        extractId(appt.ownerId),
                        extractId(doctor.userId),
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

    private isOfflinePaymentMethod(method?: string): boolean {
        const normalized = (method || '').toLowerCase();
        return normalized === 'cod' || normalized === 'cash';
    }

    private async markOfflinePaymentPaidAndCreditDoctor(appt: IAppointment): Promise<void> {
        // COD/cash: stay PENDING until visit completes, then mark PAID
        if (this.isOfflinePaymentMethod(appt.paymentMethod) && appt.paymentStatus === 'PENDING') {
            appt.paymentStatus = 'PAID';
        }

        // Razorpay/wallet are PAID at booking — credit doctor once visit is completed
        if (appt.paymentStatus !== 'PAID') return;

        const doctorProfile = await this._doctorRepository.findById(extractId(appt.doctorId));
        const doctorUserId = doctorProfile ? extractId(doctorProfile.userId) : '';
        if (!doctorUserId || !appt.totalAmount) return;

        await this._paymentService.creditDoctorWallet(
            doctorUserId,
            appt.totalAmount,
            appt._id.toString(),
            appt.appointmentId || appt._id.toString().slice(-8).toUpperCase()
        );
    }

    async createAppointment(data: CreateAppointmentServiceInput): Promise<IAppointment> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByIdWithDetails(data.doctorId);


// console.log(doctor)

            if (!doctor) throw new NotFoundError('Doctor not found');

            if (!doctor.isActive || !doctor.isVerified || doctor.profileStatus !== 'verified') {
                throw new ValidationError('Doctor is not currently available for appointments');
            }

            const doctorUser = asPopulatedUser(doctor.userId);
            if (doctorUser?.isBlocked) {
                throw new ForbiddenError('Doctor is currently unavailable');
            }

            const pet = await this._petRepository.findById(data.petId);
            if (!pet) throw new NotFoundError('Pet not found');
            if (!pet.isActive) {
                throw new ValidationError('Pet is not active');
            }




            const slot = await Slot.findById(data.slotId).session(session);
            if (!slot || slot.isBooked || slot.isBlocked) {
                throw new ConflictError('Slot is no longer available');
            }

            const appointmentDate = new Date(data.appointmentDate);
            const now = new Date();

            const appDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
            const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (appDateOnly < todayDateOnly) {
                throw new ValidationError('Cannot book an appointment in the past');
            }

            if (appDateOnly.getTime() === todayDateOnly.getTime()) {
                const [startHour, startMin] = slot.startTime.split(':').map(Number);
                const slotStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin);

                if (slotStartTime < now) {
                    throw new ValidationError('This slot has already passed for today');
                }
            }

            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            const appointmentId = `API${randomDigits}`;

            const appointment = await this._appointmentRepository.create({
                ...data,
                appointmentId,
                status: (data.paymentMethod === 'razorpay' || data.paymentMethod === 'wallet') ? AppointmentStatus.PAYMENT_PENDING : AppointmentStatus.BOOKED
            } as unknown as Partial<IAppointment>);

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
                            extractId(appointment.ownerId),
                            extractId(doctor._id),
                            extractId(doctor.userId),
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

            return appointment;
        } catch (error: unknown) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getAppointmentsByOwner(ownerId: string, page: number, limit: number, search?: string, status?: string, timeframe?: string, petFilter?: string): Promise<{ appointments: IAppointment[]; total: number }> {
        const query: FilterQuery<IAppointment> = { ownerId };
        if (status) query.status = status;

        if (timeframe && timeframe !== 'Lifetime') {
            const now = new Date();
            let startDate = new Date();

            if (timeframe === 'Today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeframe === 'This Week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                startDate.setDate(diff);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeframe === 'This Month') {
                startDate.setFullYear(now.getFullYear(), now.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
            }

            query.appointmentDate = { $gte: startDate };
        }

        if (petFilter && petFilter !== 'All Pets') {
            const matchingPetIds = await this._petRepository.findIdsBySearch(petFilter, ownerId);
            if (matchingPetIds.length > 0) {
                query.petId = { $in: matchingPetIds.map(id => new mongoose.Types.ObjectId(id)) };
            } else {
                // If pet filter requested but no pets found, return empty
                return { appointments: [], total: 0 };
            }
        }

        if (search) {
            query.$or = [
                { 'appointmentId': { $regex: search, $options: 'i' } },
                { 'serviceType': { $regex: search, $options: 'i' } }
            ];

            const matchingPetIds = await this._petRepository.findIdsBySearch(search, ownerId);
            if (matchingPetIds.length > 0) {
                query.$or.push({ petId: { $in: matchingPetIds.map(id => new mongoose.Types.ObjectId(id)) } });
            }
        }
        const { items: appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
        return { appointments, total };
    }

    async getAppointmentsByDoctor(userId: string, status?: string, page = 1, limit = 10, search?: string): Promise<{ appointments: IAppointment[]; total: number }> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) {
            return { appointments: [], total: 0 };
        }

        const query: FilterQuery<IAppointment> = { doctorId: doctor._id };
        if (status) query.status = status;

        if (search) {
            query.$or = [
                { 'appointmentId': { $regex: search, $options: 'i' } },
                { 'serviceType': { $regex: search, $options: 'i' } }
            ];

            const matchingPetIds = await this._petRepository.findIdsBySearch(search);
            if (matchingPetIds.length > 0) {
                query.$or.push({ petId: { $in: matchingPetIds } });
            }
        }

        const { items: appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
        return { appointments, total };
    }

    async getAllAppointments(page: number, limit: number, search?: string, status?: string): Promise<{ appointments: IAppointment[]; total: number }> {
        const query: FilterQuery<IAppointment> = {};
        if (status) query.status = status;
        if (search) {
            const doctorUsers = await User.find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');

            const doctors = await Doctor.find({
                userId: { $in: doctorUsers.map((u) => u._id) }
            }).select('_id');

            query.$or = [
                { 'appointmentId': { $regex: search, $options: 'i' } },
                { 'serviceType': { $regex: search, $options: 'i' } },
                { 'doctorId': { $in: doctors.map((d) => d._id) } }
            ];
        }
        const { items: appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
        return { appointments, total };
    }

    async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, userId: string): Promise<IAppointment> {
        const appointment = await this._appointmentRepository.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment not found');

        if (!appointment.appointmentId) {
            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            appointment.appointmentId = `API${randomDigits}`;
        }

        if (status === AppointmentStatus.CONFIRMED) {
            const doctor = await this._doctorRepository.findByUserId(userId);
            const appointmentDoctorId = extractId(appointment.doctorId);
            const doctorProfileId = doctor ? doctor._id.toString() : '';
            const doctorUserId = doctor ? extractId(doctor.userId) : '';
            const populatedDoctorUserId = extractId(asPopulatedDoctor(appointment.doctorId)?.userId);
            const appointmentDoctorProfile = appointmentDoctorId
                ? await this._doctorRepository.findById(appointmentDoctorId)
                : null;
            const appointmentDoctorUserId = appointmentDoctorProfile
                ? extractId(appointmentDoctorProfile.userId)
                : populatedDoctorUserId;
            const isAuthorizedDoctor = !!doctor && (
                appointmentDoctorId === doctorProfileId ||
                appointmentDoctorId === doctorUserId
            ) || (!!appointmentDoctorUserId && appointmentDoctorUserId === userId);
            if (!isAuthorizedDoctor) {
                throw new ForbiddenError('Unauthorized to update this appointment status');
            }
        }

        appointment.status = status;

        if (status === AppointmentStatus.COMPLETED) {
            await this.markOfflinePaymentPaidAndCreditDoctor(appointment);
        }

        await appointment.save();

        if (status === AppointmentStatus.CANCELLED) {
            await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false, status: 'available' });

            if (appointment.paymentStatus === 'PAID') {
                await this._paymentService.refund(appointment._id.toString(), 'Appointment cancelled by doctor');
            }
        }

        try {
            const pet = await this._petRepository.findById(extractId(appointment.petId));
            const doctor = await this._doctorRepository.findById(extractId(appointment.doctorId));
            const doctorUser = asPopulatedUser(doctor?.userId);
            const doctorName = doctorUser?.username || 'Doctor';
            const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();

            if (status === AppointmentStatus.CONFIRMED) {
                await NotificationHelper.notifyAppointmentConfirmed(
                    extractId(appointment.ownerId),
                    extractId(doctor?.userId),
                    pet?.name || 'pet',
                    doctorName,
                    dateStr,
                    appointment.appointmentStartTime,
                    appointment._id.toString()
                );
            } else if (status === AppointmentStatus.COMPLETED) {
                await NotificationHelper.notifyAppointmentCompleted(
                    extractId(appointment.ownerId),
                    extractId(doctor?.userId),
                    pet?.name || 'pet',
                    doctorName,
                    appointment._id.toString()
                );
            } else if (status === AppointmentStatus.CANCELLED) {
                await NotificationHelper.notifyAppointmentCancelled(
                    extractId(appointment.ownerId),
                    extractId(doctor?.userId),
                    pet?.name || 'pet',
                    dateStr,
                    'Status updated to cancelled',
                    appointment._id.toString(),
                    'doctor'
                );
            }
        } catch (notiError) {
            logger.error('Error creating notifications for status update', { notiError });
        }

        return appointment;
    }

    async cancelAppointment(appointmentId: string, userId: string, reason: string, providedSession?: mongoose.ClientSession): Promise<void> {
        const session = providedSession || await mongoose.startSession();
        const isInternalSession = !providedSession;

        if (isInternalSession) {
            session.startTransaction();
        }

        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new AppError('Appointment not found', HttpStatus.NOT_FOUND);

            if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
                throw new AppError('Cannot cancel this appointment', HttpStatus.BAD_REQUEST);
            }

            const now = new Date();
            const [startH, startM] = appointment.appointmentStartTime.split(':').map(Number);
            const apptStart = new Date(appointment.appointmentDate);
            apptStart.setHours(startH, startM, 0, 0);

            const graceEnd = new Date(apptStart.getTime() + 5 * 60 * 1000);
            const doctor = await this._doctorRepository.findByUserId(userId);
            const appointmentDoctorId = extractId(appointment.doctorId);
            const doctorProfileId = doctor ? doctor._id.toString() : '';
            const doctorUserId = doctor ? extractId(doctor.userId) : '';
            const populatedDoctorUserId = extractId(asPopulatedDoctor(appointment.doctorId)?.userId);
            const appointmentDoctorProfile = appointmentDoctorId
                ? await this._doctorRepository.findById(appointmentDoctorId)
                : null;
            const appointmentDoctorUserId = appointmentDoctorProfile
                ? extractId(appointmentDoctorProfile.userId)
                : populatedDoctorUserId;
            const userIsDoctor = (!!doctor && (
                appointmentDoctorId === doctorProfileId ||
                appointmentDoctorId === doctorUserId
            )) || (!!appointmentDoctorUserId && appointmentDoctorUserId === userId);
            const ownerId = extractId(appointment.ownerId);
            const userIsOwner = ownerId === userId;

            if (!userIsDoctor && !userIsOwner) {
                throw new ForbiddenError('Unauthorized to cancel this appointment');
            }

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
                    throw new AppError('No cancellation available for this situation - Appointment is already ongoing.', HttpStatus.BAD_REQUEST);
                }
            }

            let refundTriggered = false;
            if (shouldRefund && appointment.paymentStatus === 'PAID' && appointment.paymentMethod !== 'cod') {
                await this._paymentService.refund(appointment._id.toString(), finalReason, session);
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
                const pet = await this._petRepository.findById(extractId(appointment.petId));
                const doctorProfile = await this._doctorRepository.findById(extractId(appointment.doctorId));
                const doctorUserId = doctorProfile ? extractId(doctorProfile.userId) : '';
                const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();

                // Identify who cancelled
                const isDoctor = userId === doctorUserId || userId === doctorProfile?._id.toString();

                await NotificationHelper.notifyAppointmentCancelled(
                    extractId(appointment.ownerId),
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

            return;
        } catch (error: unknown) {
            if (isInternalSession) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            if (isInternalSession) {
                session.endSession();
            }
        }
    }


    async getAvailableSlots(doctorId: string, date: string | Date): Promise<ISlot[]> {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const [y, m, d] = dateStr.split('-').map(Number);

        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        const searchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000));
        const searchEnd = new Date(startOfDay.getTime() + (30 * 60 * 60 * 1000));

        const requestedDate = new Date(y, m - 1, d);

        logger.info(`[AppointmentService] Fetching slots for Doctor: ${doctorId} on Date: ${dateStr}. Search range: ${searchStart.toISOString()} - ${searchEnd.toISOString()}`);

        const doctor = await this._doctorRepository.findById(doctorId);
        if (!doctor) throw new NotFoundError('Doctor not found');

        if (doctor.recurringSchedules && doctor.recurringSchedules.length > 0) {
            const schedule = doctor.recurringSchedules[0];
            const dtstart = new Date(schedule.dtstart);
            dtstart.setHours(0, 0, 0, 0);

            const reqDate = new Date(y, m - 1, d);
            reqDate.setHours(0, 0, 0, 0);

            if (reqDate < dtstart) {
                logger.info(`[AppointmentService] Requested date ${dateStr} precedes doctor start date ${schedule.dtstart}`);
                return [];
            }

            if (schedule.dtend) {
                const dtend = new Date(schedule.dtend);
                dtend.setHours(23, 59, 59, 999);

                if (reqDate > dtend) {
                    logger.info(`[AppointmentService] Requested date ${dateStr} is after doctor end date ${schedule.dtend}`);
                    return [];
                }
            }
        }

        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
        const businessHours = doctor.businessHours ?? [];
        const businessDay = businessHours.find(bh => bh.day === dayOfWeek);

        if (businessDay && !businessDay.isWorking) {
            logger.info(`[AppointmentService] Doctor is not working on ${dayOfWeek}`);
            return [];
        }

        let allSlots = await Slot.find({
            vetId: doctor._id,
            date: { $gte: searchStart, $lte: searchEnd }
        }).sort({ startTime: 1 });

        let slots = allSlots.filter((s: ISlot) => {
            const sDate = new Date(s.date);
            const diffHours = Math.abs(sDate.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
            return diffHours < 12;
        });

        if (slots.length > 0) {
            logger.info(`[AppointmentService] Found ${slots.length} relevant slots (out of ${allSlots.length} in range).`);
            return slots.filter(s => !s.isBooked && !s.isBlocked);
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
                        status: 'available' as ISlot['status']
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
                        status: 'available' as ISlot['status']
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
                        const occBusinessDay = businessHours.find(bh => bh.day === occDayOfWeek);

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
                                    status: 'available' as ISlot['status']
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

        return slots.filter(s => !s.isBooked && !s.isBlocked);
    }

    async autoCancelMissedAppointments(): Promise<{ success: boolean; cancelledCount: number }> {
        try {
            const GRACE_PERIOD = 5;
            const now = new Date();





            const pendingAppointments = await this.appointmentModel.find({
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
                        const cancelledById = hasOwnerCheckedIn && !hasDoctorCheckedIn
                            ? extractId(appt.doctorId)
                            : extractId(appt.ownerId);
                        appt.cancellation = {
                            cancelledBy: new mongoose.Types.ObjectId(cancelledById),
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

                        // Notify parties via persistent notification
                        try {
                            const doctorProfile = await this._doctorRepository.findById(extractId(appt.doctorId));
                            const doctorUserId = doctorProfile ? extractId(doctorProfile.userId) : '';
                            const dateStr = new Date(appt.appointmentDate).toLocaleDateString();

                            await NotificationHelper.notifyAppointmentCancelled(
                                extractId(appt.ownerId),
                                doctorUserId,
                                asPopulatedPet(appt.petId)?.name || 'pet',
                                dateStr,
                                cancelReason,
                                appt._id.toString(),
                                'system' // role doesn't strictly matter here but used for logic
                            );
                        } catch (notiErr) {
                            logger.error('Error sending auto-cancel notification:', notiErr);
                        }

                        cancelledCount++;
                    }
                }
            }


            const activeAppointments = await this.appointmentModel.find({
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
                    await this.markOfflinePaymentPaidAndCreditDoctor(appt);
                    await appt.save();

                    if (SocketService.io) {
                        SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                            status: appt.status,
                            checkOut: appt.checkOut
                        });
                    }



                    try {
                        const doc = await Doctor.findById(appt.doctorId).populate('userId');
                        const doctorUser = asPopulatedUser(doc?.userId);
                        const doctorName = doctorUser?.username || 'Doctor';
                        const doctorUserId = extractId(doc?.userId);

                        await NotificationHelper.notifyAppointmentCompleted(
                            extractId(appt.ownerId),
                            doctorUserId,
                            asPopulatedPet(appt.petId)?.name || 'pet',
                            doctorName,
                            appt._id.toString()
                        );
                    } catch (notiErr) {
                        logger.error('Error sending completion notification in checkOut:', notiErr);
                    }


                }

            }

            // Ensure completed + paid visits have doctor wallet credits (safe to re-run)
            const completedPaid = await this.appointmentModel.find({
                status: AppointmentStatus.COMPLETED,
                paymentStatus: 'PAID',
                totalAmount: { $gt: 0 },
            });

            for (const appt of completedPaid) {
                await this.markOfflinePaymentPaidAndCreditDoctor(appt);
                if (appt.isModified('paymentStatus')) {
                    await appt.save();
                }
            }

            return { success: true, cancelledCount };
        } catch (error: unknown) {
            console.error('Error in auto-cancellation:', error);
            return { success: false, cancelledCount: 0 };
        }
    }

    async getAppointmentById(id: string): Promise<IAppointment> {
        const appointment = await this._appointmentRepository.findWithDetails({ _id: id });
        if (!appointment || appointment.length === 0) throw new NotFoundError('Appointment not found');
        return appointment[0];
    }


    async checkIn(appointmentId: string, role: 'owner' | 'doctor'): Promise<IAppointment> {
        const appt = await this._appointmentRepository.findById(appointmentId);
        if (!appt) throw new NotFoundError('Appointment not found');

        const now = new Date();
        const [startH, startM] = appt.appointmentStartTime.split(':').map(Number);
        const apptStart = new Date(appt.appointmentDate);
        apptStart.setHours(startH, startM, 0, 0);

        if (now < apptStart) {
            throw new AppError(`Check-in is only allowed once the appointment time starts (${appt.appointmentStartTime}).`, HttpStatus.BAD_REQUEST);
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

        if ((appt.status === AppointmentStatus.BOOKED || appt.status === AppointmentStatus.CONFIRMED) && 
            appt.checkIn?.ownerCheckInTime && appt.checkIn?.vetCheckInTime) {
            appt.status = AppointmentStatus.ONGOING;
            
            // Notify parties that consultation has started
            try {
                const doctorUserId = extractId(asPopulatedDoctor(appt.doctorId)?.userId);
                if (doctorUserId) {
                    await NotificationHelper.notifyAppointmentStarted(
                        extractId(appt.ownerId),
                        doctorUserId,
                        asPopulatedPet(appt.petId)?.name || 'pet',
                        appt._id.toString()
                    );
                }
            } catch (notiErr) {
                logger.error('Error sending start notification in checkIn:', notiErr);
            }
        }

        appt.markModified('checkIn');
        await appt.save();

        if (SocketService.io) {
            SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                status: appt.status,
                checkIn: appt.checkIn
            });
        }

        return appt;
    }

    async checkOut(appointmentId: string, role: 'owner' | 'doctor'): Promise<IAppointment> {
        const appt = await this._appointmentRepository.findById(appointmentId);
        if (!appt) throw new NotFoundError('Appointment not found');

        const now = new Date();
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
        }

        if (role === 'doctor') {
            if (appt.status === AppointmentStatus.ONGOING) {
                appt.status = AppointmentStatus.COMPLETED;
            }
            if (appt.status === AppointmentStatus.COMPLETED) {
                await this.markOfflinePaymentPaidAndCreditDoctor(appt);
            }

            const populatedDoctor = asPopulatedDoctor(appt.doctorId);
            const doctorUserId = extractId(populatedDoctor?.userId);
            const doctorName = asPopulatedUser(populatedDoctor?.userId)?.username || 'Doctor';

            if (doctorUserId) {
                try {
                    await NotificationHelper.notifyAppointmentCompleted(
                        appt.ownerId.toString(),
                        doctorUserId,
                        asPopulatedPet(appt.petId)?.name || 'pet',
                        doctorName,
                        appt._id.toString()
                    );
                } catch (notiErr) {
                    logger.error('Error sending completion notification in checkOut:', notiErr);
                }
            }
        }
        appt.markModified('checkOut');
        await appt.save();

        if (SocketService.io) {
            SocketService.io.to(`appointment:${appt._id}`).emit('status-updated', {
                status: appt.status,
                checkOut: appt.checkOut
            });
        }

        return appt;
    }

    async getPatientsByDoctor(userId: string, page: number, limit: number, search?: string, species?: string, _date?: string): Promise<{ patients: DoctorPatientListItem[]; total: number }> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) return { patients: [], total: 0 };

        const aggregation: PipelineStage[] = [
            {
                $match: {
                    doctorId: doctor._id,
                    status: AppointmentStatus.COMPLETED
                }
            },
            {
                $group: {
                    _id: { petId: "$petId" },
                    lastAppointmentDate: { $max: "$appointmentDate" },
                    ownerId: { $first: "$ownerId" }
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

        const totalResult = await this.appointmentModel.aggregate<{ total: number }>([
            ...aggregation,
            { $count: "total" }
        ]);
        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        aggregation.push(
            { $sort: { lastAppointmentDate: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        );

        const patients = await this.appointmentModel.aggregate<DoctorPatientAggregateRow>(aggregation);

        const formattedPatients: DoctorPatientListItem[] = patients.map((p) => ({
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

        return { patients: formattedPatients, total };
    }

    async getDoctorStats(doctorId: string): Promise<DoctorAppointmentStatsDto> {
        const [booked, confirmed, ongoing, cancelled, completed, requests] = await Promise.all([
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.BOOKED }),
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CONFIRMED }),
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.ONGOING }),
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCELLED }),
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.COMPLETED }),
            this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCEL_REQUEST })
        ]);

        return {
            booked,
            confirmed,
            ongoing,
            cancelled,
            completed,
            requests,
            upcoming: booked + confirmed
        };
    }

    async getOwnerStats(ownerId: string): Promise<OwnerAppointmentStatsDto> {
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
            booked,
            confirmed,
            ongoing,
            pending,
            cancelled,
            completed
        };
    }

    private async unlockSlot(slotId: string): Promise<void> {
        try {
            await Slot.findByIdAndUpdate(slotId, {
                isBooked: false,
                status: 'available'
            });
            logger.info('Slot unlocked successfully', { slotId });
        } catch (error: unknown) {
            logger.error('Failed to unlock slot', { slotId, error: getErrorMessage(error) });
        }
    }

    async cancelPendingAppointment(appointmentId: string): Promise<IAppointment> {
        const appointment = await this._appointmentRepository.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment not found');

        if (appointment.status !== AppointmentStatus.PAYMENT_PENDING) {
            throw new ValidationError('Only pending appointments can be cancelled via this method');
        }

        appointment.status = AppointmentStatus.CANCELLED;
        await appointment.save();

        if (appointment.slotId) {
            await this.unlockSlot(appointment.slotId.toString());
        }

        logger.info('Pending appointment cancelled and slot unlocked', { appointmentId });
        return appointment;
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
    async checkSlotAvailability(id: string): Promise<boolean> {
        const appointment = await this._appointmentRepository.findById(id);
        if (!appointment) throw new NotFoundError('Appointment not found');

        const slot = await Slot.findById(appointment.slotId);
        if (!slot) throw new NotFoundError('Slot record not found');

        const isAvailable = !slot.isBooked && !slot.isBlocked;

        logger.info('checkSlotAvailability check:', {
            appointmentId: id,
            slotId: slot._id,
            isBooked: slot.isBooked,
            isBlocked: slot.isBlocked,
            isAvailable
        });

        return isAvailable;
    }

    async getAllSlotsForDoctor(userId: string, date: string | Date): Promise<DoctorCalendarSlot[]> {
        const doctor = await this._doctorRepository.findByUserId(userId);
        if (!doctor) throw new NotFoundError('Doctor profile not found');

        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const [y, m, d] = dateStr.split('-').map(Number);
        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        const searchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000));
        const searchEnd = new Date(startOfDay.getTime() + (30 * 60 * 60 * 1000));

        await this.getAvailableSlots(doctor._id.toString(), date);

        const slots = await Slot.find({
            vetId: doctor._id,
            date: { $gte: searchStart, $lte: searchEnd }
        }).sort({ startTime: 1 });

        const daySlots = slots.filter((s: ISlot) => {
            const sDate = new Date(s.date);
            const diffHours = Math.abs(sDate.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
            return diffHours < 12;
        });

        const populatedSlots = await Promise.all(daySlots.map(async (slot) => {
            const slotObj = slot.toObject() as unknown as DoctorCalendarSlot;
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

        return populatedSlots;
    }
}
