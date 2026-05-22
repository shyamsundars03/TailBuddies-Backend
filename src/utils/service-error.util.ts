import { AppError } from '../errors/app-error';

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'Unknown error';
}

export function toServiceError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof AppError) {
        return error;
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error(fallbackMessage);
}
