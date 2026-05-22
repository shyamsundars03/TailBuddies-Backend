import { Request, Response, NextFunction } from 'express';
// import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';
import logger from '../logger';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    let message = err.message || ErrorMessages.INTERNAL_SERVER;
    let errors = err.errors || undefined;

    // Handle Zod Validation Errors
    if (err instanceof ZodError) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Validation failed';
        errors = err.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
        }));
    }

    // Handle Mongoose Cast Errors (Invalid ID)
    if (err.name === 'CastError') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // Handle Mongoose Duplicate Key Errors
    if (err.code === 11000) {
        statusCode = HttpStatus.CONFLICT;
        message = 'Duplicate field value entered';
    }

    // Log the error
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
        logger.error('Unhandled Error:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
    } else {
        logger.warn('Client Error:', {
            statusCode,
            message,
            path: req.path
        });
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
