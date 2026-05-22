import { z } from 'zod';

export const SpecialtySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    description: z.string().min(5, 'Description must be at least 5 characters').trim(),
    commonDesignation: z.array(z.string()).min(1, 'At least one designation is required'),
    typicalKeywords: z.array(z.string()).min(1, 'At least one keyword is required'),
    status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const UpdateSpecialtySchema = SpecialtySchema.partial();

export type SpecialtyInput = z.infer<typeof SpecialtySchema>;
export type UpdateSpecialtyInput = z.infer<typeof UpdateSpecialtySchema>;
