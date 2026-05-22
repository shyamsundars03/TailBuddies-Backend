import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpStatus } from '../constants';

const formatZodError = (error: ZodError) => ({
    success: false,
    message: 'Validation failed',
    errors: error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
    })),
});

export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(HttpStatus.BAD_REQUEST).json(formatZodError(error));
            }
            next(error);
        }
    };
};

export const validateQuery = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync(req.query);
            (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(HttpStatus.BAD_REQUEST).json(formatZodError(error));
            }
            next(error);
        }
    };
};
