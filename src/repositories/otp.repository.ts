import OTP, { IOTP } from '../models/otp.model';
import { IOtpRepository } from './interfaces/IOtpRepository';

export class OtpRepository implements IOtpRepository {
    
    
    
    async createOtp(email: string, otp: string, expiresAt: Date): Promise<IOTP> {
       


        await OTP.deleteMany({ email: email.toLowerCase() });
        const otpDoc = new OTP({
            email: email.toLowerCase(),
            otp,
            expiresAt,
        });
        return await otpDoc.save();
    }


    


    async findOtp(email: string): Promise<IOTP | null> {
        return await OTP.findOne({
            email: email.toLowerCase(),
            expiresAt: { $gt: new Date() },
        });
    }



    
    async deleteOtp(email: string): Promise<void> {
        await OTP.deleteMany({ email: email.toLowerCase() });
    }
}
