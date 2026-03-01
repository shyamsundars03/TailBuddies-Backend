import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
}

const otpSchema = new Schema<IOTP>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, 
        },
    },
    {
        timestamps: true,
    }
);

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
export default OTP;
