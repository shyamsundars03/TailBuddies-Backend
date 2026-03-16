import { z } from 'zod';

export const updateDoctorProfileSchema = z.any();

export const verifyDoctorSchema = z.object({
    isVerified: z.boolean(),
    rejectionReason: z.string().optional(),
});
