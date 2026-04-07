import { IAppointmentService } from '../interfaces/IAppointmentService';
import { IAppointmentRepository } from '../../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { IPetRepository } from '../../repositories/interfaces/IPetRepository';
import { IPaymentService } from '../interfaces/IPaymentService';
import Slot from '../../models/slot.model';
import { IAppointment, Appointment } from '../../models/appointment.model';
import { ISlot } from '../../models/slot.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import mongoose from 'mongoose';
import logger from '../../logger';

export class AppointmentService implements IAppointmentService {

    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _petRepository: IPetRepository;
    private readonly _paymentService: IPaymentService;

    constructor(
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        petRepository: IPetRepository,
        paymentService: IPaymentService
    ) {
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._petRepository = petRepository;
        this._paymentService = paymentService;
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

            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            const appointmentId = `API${randomDigits}`;

            const appointment = await this._appointmentRepository.create({
                ...data,
                appointmentId,
                status: (data.paymentMethod === 'razorpay' || data.paymentMethod === 'wallet') ? AppointmentStatus.PAYMENT_PENDING : AppointmentStatus.BOOKED
            });

            // Only mark slot as booked immediately for COD
            if (data.paymentMethod === 'cod') {
                slot.isBooked = true;
                slot.status = 'booked';
                await slot.save({ session });
            }

            await session.commitTransaction();
            return { success: true, data: appointment };
        } catch (error: any) {
            await session.abortTransaction();
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async getAppointmentsByOwner(ownerId: string, page: number, limit: number, search?: string, status?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }> {
        try {
            const query: any = { ownerId };
            if (status) query.status = status;
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

                const matchingPets = await (this._petRepository as any).model.find({
                    name: { $regex: search, $options: 'i' }
                }).select('_id');

                if (matchingPets.length > 0) {
                    query.$or.push({ petId: { $in: matchingPets.map((p: any) => p._id) } });
                }
            }

            const { appointments, total } = await this._appointmentRepository.findWithPagination(query, page, limit);
            return { success: true, data: appointments, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getAllAppointments(page: number, limit: number, search?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }> {
        try {
            const query: any = {};
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
                if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
                    throw new Error('Unauthorized');
                }
            }

            appointment.status = status;
            await appointment.save();

            if (status === AppointmentStatus.CANCELLED) {
                await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false, status: 'available' });
                
                // Trigger auto-refund if payment was made via Razorpay or Wallet
                if (appointment.paymentStatus === 'PAID') {
                     await this._paymentService.refund(appointment._id.toString(), 'Appointment cancelled by doctor');
                }
            }

            return { success: true, data: appointment };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async cancelAppointment(appointmentId: string, userId: string, reason: string): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
                throw new Error('Cannot cancel this appointment');
            }

            // If it's a request (e.g. from owner), set to CANCEL_REQUEST
            // If it's from doctor or admin, set to CANCELLED
            const isRequest = reason.toLowerCase().includes('request');
            appointment.status = isRequest ? AppointmentStatus.CANCEL_REQUEST : AppointmentStatus.CANCELLED;
            appointment.cancellation = {
                cancelledBy: new mongoose.Types.ObjectId(userId),
                cancelReason: reason,
                cancelledAt: new Date()
            };
            await appointment.save({ session });

            if (appointment.status === AppointmentStatus.CANCELLED) {
                await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false, status: 'available' }, { session });
                
                // Trigger refund if paid
                if ((appointment as any).paymentStatus === 'PAID') {
                    await this._paymentService.refund(appointment._id.toString(), 'Appointment cancelled');
                }
            }

            await session.commitTransaction();
            return { success: true, message: 'Appointment cancelled successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async getAvailableSlots(doctorId: string, date: any): Promise<{ success: boolean; data?: ISlot[]; message?: string }> {
        try {
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);

            // Normalize dates for IST (18:30 UTC = 00:00 IST)
            const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
            // Add a small buffer to the boundaries to catch boundary offsets (e.g., 18:30 UTC for IST)
            const searchStart = new Date(startOfDay.getTime() - (6 * 60 * 60 * 1000)); // -6 hours
            const searchEnd = new Date(startOfDay.getTime() + (30 * 60 * 60 * 1000)); // +30 hours (covers the full day + buffer)

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

            // Filter precisely for slots that belong to the intended day in local context
            // Many slots are stored with 18:30 UTC for IST 00:00. This logic handles that.
            let slots = allSlots.filter((s: any) => {
                const sDate = new Date(s.date);
                // Adjust for IST or just check if it's within 12 hours of the StartOfDay
                const diffHours = Math.abs(sDate.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
                return diffHours < 12; // This captures the slot regardless of the 5.5 hour offset
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

                // custom slots array if it exists
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
                    //  based on start/end time
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

            // Fallback to recurring schedules if still no slots (for wider availability rules)
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
            const GRACE_PERIOD = 10;
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
                        appt.status = 'cancelled';
                        appt.cancellation = {
                            cancelledBy: null as any,
                            cancelReason: 'Missed appointment: delayed beyond platform policy (10 mins grace period exceeded)',
                            cancelledAt: new Date()
                        };
                        await appt.save();







                        if (appt.slotId) {
                            await Slot.findByIdAndUpdate(appt.slotId._id, { status: 'cancelled', isBooked: false });
                        }
                        cancelledCount++;
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
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            const now = new Date();
            if (role === 'owner') {
                appointment.checkIn = { ...appointment.checkIn, ownerCheckInTime: now };
            } else {
                appointment.checkIn = { ...appointment.checkIn, vetCheckInTime: now };
            }

            await appointment.save();
            return { success: true, data: appointment };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async checkOut(appointmentId: string, role: 'owner' | 'doctor'): Promise<{ success: boolean; data?: IAppointment; message?: string }> {
        try {
            const appointment = await this._appointmentRepository.findById(appointmentId);
            if (!appointment) throw new Error('Appointment not found');

            const now = new Date();
            if (role === 'owner') {
                appointment.checkOut = { ...appointment.checkOut, ownerCheckOutTime: now };
            } else {
                appointment.checkOut = { ...appointment.checkOut, vetCheckOutTime: now };
                appointment.status = AppointmentStatus.COMPLETED;
            }

            await appointment.save();
            return { success: true, data: appointment };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async getPatientsByDoctor(userId: string, page: number, limit: number, search?: string): Promise<{ success: boolean; data?: any[]; total?: number; message?: string }> {
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new Error('Doctor not found');

            const doctorId = doctor._id;
            const matchQuery: any = { doctorId: new mongoose.Types.ObjectId(doctorId.toString()) };

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
            const [booked, confirmed, cancelled, completed, requests] = await Promise.all([
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.BOOKED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CONFIRMED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCELLED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.COMPLETED }),
                this._appointmentRepository.countDocuments({ doctorId, status: AppointmentStatus.CANCEL_REQUEST })
            ]);

            return {
                success: true,
                stats: {
                    booked,
                    confirmed,
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
            const [booked, confirmed, pending, cancelled, completed] = await Promise.all([
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.BOOKED }),
                this._appointmentRepository.countDocuments({ ownerId, status: AppointmentStatus.CONFIRMED }),
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

            // Only allow cancellation of pending appointments
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
            if (!appointment) throw new Error('Appointment not found');

            const slot = await Slot.findById(appointment.slotId);
            if (!slot) throw new Error('Slot record not found');

            const isAvailable = !slot.isBooked && !slot.isBlocked;
            
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
}
