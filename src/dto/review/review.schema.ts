import { z } from 'zod';
import { PaginationQuerySchema } from '../common/pagination.schema';

export const CreateReviewSchema = z.object({
    appointmentId: z.string().min(24, 'Invalid Appointment ID'),
    rating: z.number().min(1).max(5),
    comment: z.string().min(3, 'Comment must be at least 3 characters'),
});

export const UpdateReviewSchema = CreateReviewSchema.partial();

export const ReviewSchema = CreateReviewSchema;

export const ReplySchema = z.object({
    comment: z.string().min(1, 'Reply comment is required'),
});

export const ReviewPaginationQuerySchema = PaginationQuerySchema.extend({
    limit: z.coerce.number().int().positive().max(100).optional().default(4),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type ReviewInput = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
export type ReplyInput = z.infer<typeof ReplySchema>;
