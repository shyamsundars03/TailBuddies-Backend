import { NextFunction, RequestHandler, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';
import { asMiddleware } from '../utils/express-handler';

export const authorizeRoles = (...roles: string[]): RequestHandler =>
    asMiddleware((req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
        }
        next();
    });

export const adminOnly = authorizeRoles('admin');
export const doctorOnly = authorizeRoles('doctor');
export const ownerOnly = authorizeRoles('owner');
