import { z } from 'zod';
import { AppointmentStatus } from '../../enums/appointment-status.enum';

export const CreateAppointmentSchema = z.object({
    doctorId: z.string().min(24, 'Invalid Doctor ID'),
    petId: z.string().min(24, 'Invalid Pet ID'),
    slotId: z.string().min(24, 'Invalid Slot ID'),
    appointmentDate: z.string().or(z.date()),
    appointmentStartTime: z.string(),
    appointmentEndTime: z.string(),
    serviceType: z.string(),
    problemDescription: z.string().min(1, 'Problem description is required'),
    symptoms: z.array(z.string()).default([]),
    totalAmount: z.number().min(0),
    paymentMethod: z.enum(['cod', 'razorpay', 'wallet', 'cash']),
    mode: z.enum(['online', 'offline']).default('offline'),
});

export const UpdateAppointmentStatusSchema = z.object({
    status: z.nativeEnum(AppointmentStatus),
    reason: z.string().optional(),
});

export const CheckInSchema = z.object({
    role: z.enum(['owner', 'doctor']),
});

export const CancelAppointmentSchema = z.object({
    reason: z.string().optional(),
});

export const GetAvailableSlotsQuerySchema = z.object({
    doctorId: z.string().min(24, 'Invalid Doctor ID'),
    date: z.string().min(1, 'Date is required'),
});

export const OwnerAppointmentsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    status: z.string().optional(),
    timeframe: z.string().optional(),
    pet: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type CreateAppointmentServiceInput = CreateAppointmentInput & { ownerId: string };
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>;
export type CheckInInput = z.infer<typeof CheckInSchema>;
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
export type GetAvailableSlotsQueryInput = z.infer<typeof GetAvailableSlotsQuerySchema>;
export type OwnerAppointmentsQueryInput = z.infer<typeof OwnerAppointmentsQuerySchema>;
