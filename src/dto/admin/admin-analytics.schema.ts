import { z } from 'zod';
import { PaginationQuerySchema } from '../common/pagination.schema';

export const DashboardStatsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    grouping: z.string().optional(),
});

export const ReportsQuerySchema = PaginationQuerySchema.extend({
    from: z.string().optional(),
    to: z.string().optional(),
    specialtyId: z.string().optional(),
});

export const SpecialtyStatsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
});

export type DashboardStatsQueryInput = z.infer<typeof DashboardStatsQuerySchema>;
export type ReportsQueryInput = z.infer<typeof ReportsQuerySchema>;
export type SpecialtyStatsQueryInput = z.infer<typeof SpecialtyStatsQuerySchema>;
