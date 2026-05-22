import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IAppointment } from '../models/appointment.model';
import { NotFoundError, ForbiddenError } from '../errors/app-error';
import { resolveRefId } from '../utils/resolve-ref-id';

export class AppointmentAccessService {
    constructor(
        private readonly _appointmentRepository: IAppointmentRepository,
        private readonly _doctorRepository: IDoctorRepository
    ) {}

    async assertAppointmentAccess(appointmentId: string, userId: string, role: string): Promise<IAppointment> {
        const appointment = await this._appointmentRepository.findById(appointmentId);
        if (!appointment) {
            throw new NotFoundError('Appointment not found');
        }

        const ownerId = resolveRefId(appointment.ownerId);

        if (role === 'owner' && ownerId === userId) {
            return appointment;
        }

        if (role === 'doctor') {
            const doctor = await this._doctorRepository.findByUserId(userId);
            const appointmentDoctorId = resolveRefId(appointment.doctorId);
            if (doctor && appointmentDoctorId === doctor._id.toString()) {
                return appointment;
            }
        }

        if (role === 'admin') {
            return appointment;
        }

        throw new ForbiddenError('You are not authorized to access this appointment');
    }
}
