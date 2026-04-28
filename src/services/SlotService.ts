import { ISlotService } from './interfaces/ISlotService';
import { ISlotRepository } from '../repositories/interfaces/ISlotRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IAppointmentService } from './interfaces/IAppointmentService';
import mongoose from 'mongoose';
import logger from '../logger';
import { Slot } from '../models/slot.model';
import { Appointment } from '../models/appointment.model';

export class SlotService implements ISlotService {
    private readonly _slotRepository: ISlotRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _appointmentService: IAppointmentService;

    constructor(
        slotRepository: ISlotRepository,
        doctorRepository: IDoctorRepository,
        appointmentService: IAppointmentService
    ) {
        this._slotRepository = slotRepository;
        this._doctorRepository = doctorRepository;
        this._appointmentService = appointmentService;
    }

    async blockSlots(userId: string, slotIds: string[]): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new Error('Doctor not found');

            const now = new Date();

            for (const slotId of slotIds) {
                const slot = await Slot.findById(slotId).session(session);
                if (!slot) continue;

                // 1. Authorization check
                if (slot.vetId.toString() !== doctor._id.toString()) {
                    throw new Error('Unauthorized to block this slot');
                }

                // 2. Future check
                const [startH, startM] = slot.startTime.split(':').map(Number);
                const slotDateTime = new Date(slot.date);
                slotDateTime.setHours(startH, startM, 0, 0);

                if (slotDateTime <= now) {
                    throw new Error(`Cannot block past slot: ${slot.startTime}`);
                }

                // 3. Handle existing appointments
                if (slot.isBooked && !slot.isBlocked) {
                    const appointment = await Appointment.findOne({ slotId: slot._id, status: { $ne: 'cancelled' } }).session(session);
                    if (appointment) {
                        logger.info(`Blocking slot ${slotId} requires cancelling appointment ${appointment._id}`);
                        const cancelResult = await this._appointmentService.cancelAppointment(
                            appointment._id.toString(),
                            userId,
                            'Slot blocked by doctor for personal reasons',
                            session
                        );
                        if (!cancelResult.success) {
                            throw new Error(`Failed to cancel appointment for slot ${slot.startTime}: ${cancelResult.message}`);
                        }
                    }
                }


                // 4. Update slot
                slot.isBooked = true;
                slot.isBlocked = true;
                slot.status = 'unavailable';
                await slot.save({ session });
            }

            await session.commitTransaction();
            return { success: true, message: 'Slots blocked successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error blocking slots', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async unblockSlots(userId: string, slotIds: string[]): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new Error('Doctor not found');

            for (const slotId of slotIds) {
                const slot = await Slot.findById(slotId).session(session);
                if (!slot) continue;

                if (slot.vetId.toString() !== doctor._id.toString()) {
                    throw new Error('Unauthorized to unblock this slot');
                }

                if (!slot.isBlocked) continue;

                slot.isBooked = false;
                slot.isBlocked = false;
                slot.status = 'available';
                await slot.save({ session });
            }

            await session.commitTransaction();
            return { success: true, message: 'Slots unblocked successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error unblocking slots', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }
}
