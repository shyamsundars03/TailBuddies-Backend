import { Response } from 'express';
import { env } from '../config/env';

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: env.jwtRefreshMaxAge,
    });
};

export const clearRefreshTokenCookie = (res: Response): void => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
};
