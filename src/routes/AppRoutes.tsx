import { Route, Routes } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import HomePage from "../pages/HomePage";
import CourtListPage from "../pages/CourtListPage";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import RegisterPage from "../pages/RegisterPage";
import BookingHistoryPage from "../pages/BookingHistoryPage";
import RequireAuth from "../components/auth/RequireAuth";
import ComingSoonPage from "../pages/ComingSoonPage";
import BookingPage from "../pages/BookingPage";
import ProfilePage from "../pages/ProfilePage";
import MatchPage from "../pages/MatchPage";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/owner"
        element={
          <RequireAuth>
            <OwnerDashboardPage />
          </RequireAuth>
        }
      />

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courts" element={<CourtListPage />} />
        <Route path="/courts/:id" element={<BookingPage />} />
        <Route path="/courts/:id/booking" element={<BookingPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <BookingHistoryPage />
            </RequireAuth>
          }
        />
        <Route path="/matches" element={<MatchPage />} />
        <Route
          path="/help"
          element={
            <ComingSoonPage
              eyebrow="Hỗ trợ người dùng"
              title="Trung tâm trợ giúp"
              description="Bạn có thể tìm sân và đặt lịch ngay; nội dung hướng dẫn chi tiết sẽ được bổ sung sau."
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
