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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courts" element={<CourtListPage />} />
        <Route path="/courts/:id" element={<BookingPage />} />
        <Route path="/courts/:id/booking" element={<BookingPage />} />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <BookingHistoryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/matches"
          element={
            <ComingSoonPage
              eyebrow="Kết nối cộng đồng"
              title="Tìm kèo cầu lông"
              description="Tính năng tìm người chơi cùng trình độ đang được hoàn thiện cho phiên bản tiếp theo."
            />
          }
        />
        <Route
          path="/owner"
          element={
            <ComingSoonPage
              eyebrow="Đối tác sân cầu"
              title="Dành cho chủ sân"
              description="Khu vực quản lý sân, lịch và doanh thu đang được hoàn thiện."
            />
          }
        />
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
