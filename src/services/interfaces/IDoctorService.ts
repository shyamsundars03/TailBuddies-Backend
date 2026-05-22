import { IDoctor } from '../../models/doctor.model';
import { ISpecialty } from '../../models/specialty.model';
import { UpdateDoctorProfileInput, VerifyDoctorInput } from '../../dto/doctor/doctor.schema';

export interface IDoctorService {
    getDoctorProfile(userId: string): Promise<IDoctor | null>;
    getDoctorById(doctorId: string): Promise<IDoctor | null>;
    updateDoctorProfile(userId: string, data: UpdateDoctorProfileInput): Promise<IDoctor>;
    verifyDoctor(doctorId: string, data: VerifyDoctorInput): Promise<IDoctor>;
    requestVerification(userId: string): Promise<IDoctor>;
    getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string, filters?: Record<string, unknown>, sortBy?: string): Promise<{ doctors: IDoctor[], total: number }>;
    getSpecialties(): Promise<ISpecialty[]>;
}
