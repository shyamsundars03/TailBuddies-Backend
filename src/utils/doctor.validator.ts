import { z } from 'zod';

export const updateDoctorProfileSchema = z.any();

export const verifyDoctorSchema = z.object({
    isVerified: z.boolean().optional(),
    rejectionReason: z.string().optional(),
    verificationStatus: z.record(z.string(), z.boolean()).optional(),
}).refine((data) => data.isVerified !== undefined || data.verificationStatus !== undefined, {
    message: 'Either isVerified or verificationStatus is required',
});
