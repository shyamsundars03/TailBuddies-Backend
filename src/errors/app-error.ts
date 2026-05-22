import { HttpStatus } from '../constants';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public readonly errors?: any[];
    constructor(message: string = 'Validation Failed', errors?: any[]) {
        super(message, HttpStatus.BAD_REQUEST);
        this.errors = errors;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized access') {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden: Insufficient permissions') {
        super(message, HttpStatus.FORBIDDEN);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, HttpStatus.NOT_FOUND);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, HttpStatus.CONFLICT);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
