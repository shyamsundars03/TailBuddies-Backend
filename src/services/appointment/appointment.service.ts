import { IAppointmentService } from '../interfaces/IAppointmentService';
import { IAppointmentRepository } from '../../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { IPetRepository } from '../../repositories/interfaces/IPetRepository';
import Slot from '../../models/slot.model';
import { IAppointment } from '../../models/appointment.model';
import { ISlot } from '../../models/slot.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import mongoose from 'mongoose';

export class AppointmentService implements IAppointmentService {
    
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _petRepository: IPetRepository;

    constructor(
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        petRepository: IPetRepository
    ) {
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._petRepository = petRepository;
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
                status: AppointmentStatus.BOOKED
            });

            slot.isBooked = true;
            await slot.save({ session });

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
                await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false });
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

            appointment.status = AppointmentStatus.CANCELLED;
            appointment.cancellation = {
                cancelledBy: new mongoose.Types.ObjectId(userId),
                cancelReason: reason,
                cancelledAt: new Date()
            };
            await appointment.save({ session });

            await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false }, { session });

            await session.commitTransaction();
            return { success: true, message: 'Appointment cancelled successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async getAvailableSlots(doctorId: string, date: Date): Promise<{ success: boolean; data?: ISlot[]; message?: string }> {
        try {
            const requestedDate = new Date(date);
            const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));
            
            let slots = await Slot.find({
                vetId: doctorId,
                date: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ startTime: 1 });

            if (slots.length === 0) {
                const doctor = await this._doctorRepository.findById(doctorId);
                if (!doctor) throw new Error('Doctor not found');

                const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
                const businessDay = doctor.businessHours.find(bh => bh.day === dayOfWeek);

                if (businessDay && businessDay.isWorking && businessDay.slots.length > 0) {
                    const duration = doctor.appointmentDuration || 30;
                    const sortedBusinessSlots = [...businessDay.slots].sort();
                    const firstSlot = sortedBusinessSlots[0];
                    const lastSlot = sortedBusinessSlots[sortedBusinessSlots.length - 1];

                    const [startH, startM] = firstSlot.split(':').map(Number);
                    const [endH, endM] = lastSlot.split(':').map(Number);
                    
                    let currentTotalMinutes = startH * 60 + startM;
                    const endTotalMinutesLimit = endH * 60 + endM;

                    const newSlotsData = [];
                    while (currentTotalMinutes <= endTotalMinutesLimit) {
                        const h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
                        const m = (currentTotalMinutes % 60).toString().padStart(2, '0');
                        const startTime = `${h}:${m}`;

                        const nextTotalMinutes = currentTotalMinutes + duration;
                        const nextH = Math.floor(nextTotalMinutes / 60).toString().padStart(2, '0');
                        const nextM = (nextTotalMinutes % 60).toString().padStart(2, '0');
                        const endTime = `${nextH}:${nextM}`;

                        newSlotsData.push({
                            vetId: new mongoose.Types.ObjectId(doctorId),
                            date: new Date(startOfDay),
                            startTime,
                            endTime,
                            isBooked: false,
                            isBlocked: false
                        });

                        currentTotalMinutes += duration;
                    }
                    slots = await Slot.insertMany(newSlotsData);
                }
            }

            const availableSlots = slots.filter(s => !s.isBooked && !s.isBlocked);
            return { success: true, data: availableSlots };
        } catch (error: any) {
            return { success: false, message: error.message };
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
                            { "owner.userName": { $regex: search, $options: 'i' } }
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
                ownerName: p.owner.userName,
                ownerEmail: p.owner.email,
                lastAppointmentDate: p.lastAppointmentDate,
                picture: p.pet.picture
            }));

            return { success: true, data: formattedPatients, total };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
