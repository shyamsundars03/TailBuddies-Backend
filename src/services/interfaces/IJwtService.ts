export interface IJwtService {
    generateAccessToken(payload: Record<string, unknown>): string;
    generateRefreshToken(payload: Record<string, unknown>): string;
    verifyToken(token: string, secret: string): unknown;
}
