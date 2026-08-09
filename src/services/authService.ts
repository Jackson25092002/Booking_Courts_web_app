import api from "./api";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginData {
  user: AuthUser;
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export async function register(input: RegisterInput) {
  const response = await api.post<ApiResponse<{ user: AuthUser }>>(
    "/api/auth/register",
    input,
  );

  return response.data;
}

export async function login(input: LoginInput) {
  const response = await api.post<ApiResponse<LoginData>>(
    "/api/auth/login",
    input,
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<ApiResponse<{ user: AuthUser }>>("/api/auth/me");
  return response.data;
}
