import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';

export const authorizeRoles = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
        }
        next();
    };
};

export const adminOnly = authorizeRoles('admin');
export const doctorOnly = authorizeRoles('doctor');
