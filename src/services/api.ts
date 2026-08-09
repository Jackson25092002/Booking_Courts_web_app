import axios, { AxiosError } from "axios";

export const ACCESS_TOKEN_KEY = "len_keo_access_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export function getApiError(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;

    return {
      message: data?.message ?? "Không thể kết nối đến máy chủ.",
      errors: data?.errors,
      status: error.response?.status,
    };
  }

  return {
    message: "Đã xảy ra lỗi không xác định.",
  };
}

export default api;
