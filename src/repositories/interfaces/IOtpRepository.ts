import { IOTP } from '../../models/otp.model';

export interface IOtpRepository {
    createOtp(email: string, otp: string, expiresAt: Date): Promise<IOTP>;
    findOtp(email: string): Promise<IOTP | null>;
    deleteOtp(email: string): Promise<void>;
}
