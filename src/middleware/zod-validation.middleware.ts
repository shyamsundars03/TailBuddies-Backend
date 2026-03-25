import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpStatus } from '../constants';

export const validateRequest = (schema: ZodSchema) => {


    
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map(err => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            next(error);
        }
    };
};
