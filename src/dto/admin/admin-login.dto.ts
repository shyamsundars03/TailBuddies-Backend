import { z } from 'zod';

export const AdminLoginSchema = z.object({
    email: z.string().email('Invalid email format').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required')
});

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;

export interface AdminLoginResponseDto {
    id: string;
    email: string;
    role: string;
    accessToken: string;
    refreshToken: string;
}
