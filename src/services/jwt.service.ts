import jwt from 'jsonwebtoken';
import { IJwtService } from './interfaces/IJwtService';
import { env } from '../config/env';

export class JwtService implements IJwtService {
    generateAccessToken(payload: Record<string, unknown>): string {
        return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiry as any });
    }

    generateRefreshToken(payload: Record<string, unknown>): string {
        return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiry as any });
    }

    verifyToken(token: string, secret: string): unknown {
        return jwt.verify(token, secret);
    }
}
