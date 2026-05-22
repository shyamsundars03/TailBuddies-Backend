import { NextFunction, RequestHandler, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';

export type AuthRouteHandler = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => void | Promise<void>;

/** Bridges typed auth handlers to Express RequestHandler without `as unknown as` at call sites. */
export function asMiddleware(handler: AuthRouteHandler): RequestHandler {
    const wrapped: RequestHandler = (req, res, next) => {
        void Promise.resolve(handler(req as AuthRequest, res, next)).catch(next);
    };
    return wrapped;
}
