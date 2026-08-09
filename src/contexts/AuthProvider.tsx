import { useEffect, useState, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ACCESS_TOKEN_KEY } from "../services/api";
import {
  getCurrentUser,
  login,
  type AuthUser,
  type LoginInput,
} from "../services/authService";
import { AUTH_USER_KEY, AuthContext } from "./auth";

function clearStoredAuth() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function readStoredUser() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    clearStoredAuth();
    return null;
  }
}

function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [initialLocation] = useState(() => ({
    pathname: location.pathname,
    destination: `${location.pathname}${location.search}`,
  }));

  useEffect(() => {
    let shouldIgnore = false;
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setIsAuthLoading(false);
      return;
    }

    async function validateSession() {
      try {
        const response = await getCurrentUser();

        if (!shouldIgnore) {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data.user));
          setUser(response.data.user);
        }
      } catch {
        if (!shouldIgnore) {
          clearStoredAuth();
          setUser(null);

          if (initialLocation.pathname !== "/login" && initialLocation.pathname !== "/register") {
            navigate("/login", {
              replace: true,
              state: {
                from: initialLocation.destination,
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
              },
            });
          }
        }
      } finally {
        if (!shouldIgnore) setIsAuthLoading(false);
      }
    }

    void validateSession();

    return () => {
      shouldIgnore = true;
    };
  }, [initialLocation, navigate]);

  async function signIn(input: LoginInput) {
    const response = await login(input);

    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data.user));
    setUser(response.data.user);
  }

  function signOut() {
    clearStoredAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAuthLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
