import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";

function RequireAuth({ children }: PropsWithChildren) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <div className="route-loading" role="status">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: location.pathname === "/history"
            ? "Vui lòng đăng nhập để xem lịch sử đặt sân."
            : "Vui lòng đăng nhập để sử dụng chức năng này.",
        }}
      />
    );
  }

  return children;
}

export default RequireAuth;
