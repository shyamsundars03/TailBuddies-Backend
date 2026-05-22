import { z } from 'zod';

export const AnalyzeIssueSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    petId: z.string().min(24, 'Invalid Pet ID'),
    description: z.string().min(3, 'Description must be at least 3 characters'),
});

export type AnalyzeIssueInput = z.infer<typeof AnalyzeIssueSchema>;
