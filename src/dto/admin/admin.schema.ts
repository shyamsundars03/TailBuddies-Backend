import { z } from 'zod';

export const PaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).default(10),
    search: z.string().optional(),
});

export const GetSpecialtiesSchema = PaginationSchema;

export const GetUsersSchema = PaginationSchema.extend({
    role: z.string().optional(),
});

export const GetDoctorsSchema = PaginationSchema.extend({
    isVerified: z.boolean().optional(),
    status: z.string().optional(),
});

export const CreateSpecialtySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    commonDesignation: z.array(z.string()).optional(),
    typicalKeywords: z.array(z.string()).optional(),
});

export const UpdateSpecialtySchema = CreateSpecialtySchema.partial();

export const VerifyDoctorSchema = z.object({
    isVerified: z.boolean(),
    rejectionReason: z.string().optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
export type GetSpecialtiesInput = z.infer<typeof GetSpecialtiesSchema>;
export type GetUsersInput = z.infer<typeof GetUsersSchema>;
export type GetDoctorsInput = z.infer<typeof GetDoctorsSchema>;
export type CreateSpecialtyInput = z.infer<typeof CreateSpecialtySchema>;
export type UpdateSpecialtyInput = z.infer<typeof UpdateSpecialtySchema>;
export type VerifyDoctorInput = z.infer<typeof VerifyDoctorSchema>;
