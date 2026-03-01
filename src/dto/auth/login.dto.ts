export interface LoginDto {
    email: string;
    password: string;
    role?: string;
}

export interface LoginResponseDto {
    id: string;
    userName: string;
    email: string;
    role: string;
    accessToken: string;
    refreshToken: string;
}
