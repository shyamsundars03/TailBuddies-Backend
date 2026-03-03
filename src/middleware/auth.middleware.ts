import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';
import { UserRole } from '../enums/user-role.enum';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

import { User } from '../models/user.models';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(ErrorMessages.TOKEN_MISSING, HttpStatus.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, env.jwtAccessSecret) as { userId: string, role: string };

        // Only check block status for non-admin users (Admins are in a separate collection)
        if (decoded.role !== UserRole.ADMIN) {
            const user = await User.findById(decoded.userId).select('isBlocked');
            if (!user) {
                return next(new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND));
            }

            if (user.isBlocked) {
                return next(new AppError(ErrorMessages.ACCOUNT_BLOCKED, HttpStatus.FORBIDDEN));
            }
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof AppError) return next(error);
        return next(new AppError(ErrorMessages.TOKEN_INVALID, HttpStatus.UNAUTHORIZED));
    }
};
