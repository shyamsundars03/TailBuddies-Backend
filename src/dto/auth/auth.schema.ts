import { z } from 'zod';
import { UserRole } from '../../enums/user-role.enum';

const emailSchema = z
    .string()
    .min(1, 'Email is required')
    // .email('Invalid email format')
    // .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/, 'Please enter a valid Gmail address (@gmail.com)')
    .toLowerCase()
    .trim();

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must include uppercase, lowercase, number and special character (@$!%*?&)'
    );

const phoneSchema = z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits');

export const LoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    role: z.nativeEnum(UserRole).optional()
});

export const RegisterSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    gender: z.string().optional(),
    role: z.nativeEnum(UserRole).optional()
});

export const VerifyOtpSchema = z.object({
    email: emailSchema,
    otp: z.string().length(6, 'OTP must be 6 digits'),
    userData: RegisterSchema.nullable().optional(),
    purpose: z.enum(['registration', 'forgotPassword', 'login', 'reset']).optional()
});

export const ForgotPasswordSchema = z.object({
    email: emailSchema
});

export const ResetPasswordSchema = z.object({
    email: emailSchema,
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: passwordSchema
});

export const ChangePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: passwordSchema
});

export const GoogleLoginSchema = z.object({
    idToken: z.string().min(1, 'ID Token is required'),
    role: z.nativeEnum(UserRole)
});

export const ResendOtpSchema = z.object({
    email: emailSchema
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;
