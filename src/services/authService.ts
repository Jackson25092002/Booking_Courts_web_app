import api from "./api";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate?: string | null;
  playDistrict?: string | null;
  skillLevel?: "A" | "B" | "C" | "D" | null;
  role: UserRole;
  createdAt?: string;
}

export interface ProfileStats {
  bookingCount: number;
  completedBookingCount: number;
  reviewCount: number;
}

export interface UpdateProfileInput {
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: AuthUser["gender"];
  birthDate: string | null;
  playDistrict: string;
  skillLevel: AuthUser["skillLevel"];
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
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
  const response = await api.get<
    ApiResponse<{ user: AuthUser; stats: ProfileStats }>
  >("/api/auth/me");
  return response.data;
}

export async function updateCurrentUser(input: UpdateProfileInput) {
  const response = await api.patch<
    ApiResponse<{ user: AuthUser; stats: ProfileStats }>
  >("/api/auth/me", input);
  return response.data;
}
