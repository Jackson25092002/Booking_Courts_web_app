import { createContext } from "react";
import type { AuthUser, LoginInput } from "../services/authService";

export const AUTH_USER_KEY = "len_keo_auth_user";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
