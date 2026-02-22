export interface RegisterDto {
  username: string;
  email: string;
  phone: string;
  password: string;
  gender?: string;
  role?: string;
}

export interface RegisterResponseDto {
  id: string;
  userName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}