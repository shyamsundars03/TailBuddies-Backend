import { z } from 'zod';

export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
});

export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
