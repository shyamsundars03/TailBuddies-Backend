import { IAppointment } from '../../models/appointment.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { ISlot } from '../../models/slot.model';

export interface IAppointmentService {
    createAppointment(data: any): Promise<{ success: boolean; data?: IAppointment; message?: string }>;
    getAppointmentsByOwner(ownerId: string, page: number, limit: number, search?: string, status?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }>;
    getAppointmentsByDoctor(doctorId: string, status?: string, page?: number, limit?: number, search?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }>;
    getAllAppointments(page: number, limit: number, search?: string): Promise<{ success: boolean; data?: IAppointment[]; total?: number; message?: string }>;
    updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, userId: string): Promise<{ success: boolean; data?: IAppointment; message?: string }>;
    cancelAppointment(appointmentId: string, userId: string, reason: string): Promise<{ success: boolean; message: string }>;
    getAvailableSlots(doctorId: string, date: Date): Promise<{ success: boolean; data?: ISlot[]; message?: string }>;
    getAppointmentById(id: string): Promise<{ success: boolean; data?: IAppointment; message?: string }>;
    checkIn(appointmentId: string, role: 'owner' | 'doctor'): Promise<{ success: boolean; data?: IAppointment; message?: string }>;
    checkOut(appointmentId: string, role: 'owner' | 'doctor'): Promise<{ success: boolean; data?: IAppointment; message?: string }>;
    getPatientsByDoctor(doctorId: string, page: number, limit: number, search?: string): Promise<{ success: boolean; data?: any[]; total?: number; message?: string }>;
}
