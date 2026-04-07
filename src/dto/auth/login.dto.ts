export interface LoginDto {
    email: string;
    password: string;
    role?: string;
}

export interface LoginResponseDto {
    id: string;
    username: string;
    email: string;
    role: string;
    phone?: string;
    gender?: string;
    profilePic?: string;
    accessToken: string;
    refreshToken: string;
}
