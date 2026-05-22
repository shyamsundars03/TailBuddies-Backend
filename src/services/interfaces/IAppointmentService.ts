import { IAppointment } from '../../models/appointment.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { ISlot } from '../../models/slot.model';
import { CreateAppointmentServiceInput } from '../../dto/appointment/appointment.schema';
import { DoctorAppointmentStatsDto, OwnerAppointmentStatsDto } from '../../dto/appointment/appointment-stats.dto';
import { ClientSession } from 'mongoose';
import { DoctorCalendarSlot, DoctorPatientListItem } from '../../types/appointment-service.types';

export interface AppointmentListResult {
    appointments: IAppointment[];
    total: number;
}

export interface PatientListResult {
    patients: DoctorPatientListItem[];
    total: number;
}

export interface IAppointmentService {
    createAppointment(data: CreateAppointmentServiceInput): Promise<IAppointment>;
    getAppointmentsByOwner(ownerId: string, page: number, limit: number, search?: string, status?: string, timeframe?: string, pet?: string): Promise<AppointmentListResult>;
    getAppointmentsByDoctor(doctorId: string, status?: string, page?: number, limit?: number, search?: string): Promise<AppointmentListResult>;
    getAllAppointments(page: number, limit: number, search?: string, status?: string): Promise<AppointmentListResult>;
    updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, userId: string): Promise<IAppointment>;
    cancelAppointment(appointmentId: string, userId: string, reason: string, session?: ClientSession): Promise<void>;
    getAvailableSlots(doctorId: string, date: Date | string): Promise<ISlot[]>;
    getAppointmentById(id: string): Promise<IAppointment>;
    checkIn(appointmentId: string, role: 'owner' | 'doctor'): Promise<IAppointment>;
    checkOut(appointmentId: string, role: 'owner' | 'doctor'): Promise<IAppointment>;
    getPatientsByDoctor(doctorId: string, page: number, limit: number, search?: string, species?: string, date?: string): Promise<PatientListResult>;
    getDoctorStats(doctorId: string): Promise<DoctorAppointmentStatsDto>;
    getOwnerStats(ownerId: string): Promise<OwnerAppointmentStatsDto>;
    cancelPendingAppointment(appointmentId: string): Promise<IAppointment>;
    checkSlotAvailability(appointmentId: string): Promise<boolean>;
    getAllSlotsForDoctor(userId: string, date: string): Promise<DoctorCalendarSlot[]>;
}
