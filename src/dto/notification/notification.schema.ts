import { z } from 'zod';

export const GetNotificationsQuerySchema = z.object({
    status: z.enum(['unread', 'read']).optional(),
});

export type GetNotificationsQueryInput = z.infer<typeof GetNotificationsQuerySchema>;
