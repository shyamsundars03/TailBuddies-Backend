import { IDoctor } from '../../models/doctor.model';
import { UpdateDoctorProfileDto, VerifyDoctorDto } from '../../dto/doctor.dto';

export interface IDoctorService {
    getDoctorProfile(userId: string): Promise<IDoctor | null>;
    getDoctorById(doctorId: string): Promise<IDoctor | null>;
    updateDoctorProfile(userId: string, data: UpdateDoctorProfileDto): Promise<IDoctor>;
    verifyDoctor(doctorId: string, data: VerifyDoctorDto): Promise<IDoctor>;
    requestVerification(userId: string): Promise<IDoctor>;
    getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string, filters?: any): Promise<{ doctors: IDoctor[], total: number }>;
    getSpecialties(): Promise<any[]>;
}
