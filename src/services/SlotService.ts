import { ISlotService } from './interfaces/ISlotService';
import { ISlotRepository } from '../repositories/interfaces/ISlotRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IAppointmentService } from './interfaces/IAppointmentService';
import mongoose from 'mongoose';
import logger from '../logger';

import { NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error';
import { toServiceError } from '../utils/service-error.util';

export class SlotService implements ISlotService {
    private readonly _slotRepository: ISlotRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _appointmentService: IAppointmentService;

    constructor(
        slotRepository: ISlotRepository,
        doctorRepository: IDoctorRepository,
        appointmentRepository: IAppointmentRepository,
        appointmentService: IAppointmentService
    ) {
        this._slotRepository = slotRepository;
        this._doctorRepository = doctorRepository;
        this._appointmentRepository = appointmentRepository;
        this._appointmentService = appointmentService;
    }

    async blockSlots(userId: string, slotIds: string[]): Promise<{ message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new NotFoundError('Doctor not found');

            const now = new Date();

            for (const slotId of slotIds) {
                const slot = await this._slotRepository.findByIdWithSession(slotId, session);
                if (!slot) continue;

                if (slot.vetId.toString() !== doctor._id.toString()) {
                    throw new ForbiddenError('Unauthorized to block this slot');
                }

                const [startH, startM] = slot.startTime.split(':').map(Number);
                const slotDateTime = new Date(slot.date);
                slotDateTime.setHours(startH, startM, 0, 0);

                if (slotDateTime <= now) {
                    throw new ValidationError(`Cannot block past slot: ${slot.startTime}`);
                }

                if (slot.isBooked && !slot.isBlocked) {
                    const appointment = await this._appointmentRepository.findOneWithSession({ slotId: slot._id, status: { $ne: 'cancelled' } }, session);
                    if (appointment) {
                        logger.info(`Blocking slot ${slotId} requires cancelling appointment ${appointment._id}`);
                        await this._appointmentService.cancelAppointment(
                            appointment._id.toString(),
                            userId,
                            'Slot blocked by doctor for personal reasons',
                            session
                        );
                    }
                }

                await this._slotRepository.updateWithSession(slotId, {
                    isBooked: true,
                    isBlocked: true,
                    status: 'unavailable'
                }, session);
            }

            await session.commitTransaction();
            return { message: 'Slots blocked successfully' };
        } catch (error: unknown) {
            await session.abortTransaction();
            const err = toServiceError(error, 'Error blocking slots');
            logger.error('Error blocking slots', { error: err.message });
            throw err;
        } finally {
            session.endSession();
        }
    }

    async unblockSlots(userId: string, slotIds: string[]): Promise<{ message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const doctor = await this._doctorRepository.findByUserId(userId);
            if (!doctor) throw new NotFoundError('Doctor not found');

            for (const slotId of slotIds) {
                const slot = await this._slotRepository.findByIdWithSession(slotId, session);
                if (!slot) continue;

                if (slot.vetId.toString() !== doctor._id.toString()) {
                    throw new ForbiddenError('Unauthorized to unblock this slot');
                }

                if (!slot.isBlocked) continue;

                await this._slotRepository.updateWithSession(slotId, {
                    isBooked: false,
                    isBlocked: false,
                    status: 'available'
                }, session);
            }

            await session.commitTransaction();
            return { message: 'Slots unblocked successfully' };
        } catch (error: unknown) {
            await session.abortTransaction();
            const err = toServiceError(error, 'Error unblocking slots');
            logger.error('Error unblocking slots', { error: err.message });
            throw err;
        } finally {
            session.endSession();
        }
    }
}
