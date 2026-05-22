import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: string;
        email?: string;
    };
    validatedQuery?: Record<string, unknown>;
}
