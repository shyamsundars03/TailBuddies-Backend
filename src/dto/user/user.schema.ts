import { z } from 'zod';
import { Gender } from '../../enums/gender.enum';

export const UpdateProfileSchema = z.object({
    username: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
});

export const ProfilePicSchema = z.object({
    profilePic: z.string().min(1, "No image provided"),
});

export const OtpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

export const NewEmailSchema = z.object({
    newEmail: z.string().email("Invalid email format"),
});

export const VerifyNewEmailSchema = z.object({
    newEmail: z.string().email("Invalid email format"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ProfilePicInput = z.infer<typeof ProfilePicSchema>;
export type OtpInput = z.infer<typeof OtpSchema>;
export type NewEmailInput = z.infer<typeof NewEmailSchema>;
export type VerifyNewEmailInput = z.infer<typeof VerifyNewEmailSchema>;
