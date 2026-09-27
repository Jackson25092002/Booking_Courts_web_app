import { Route, Routes } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import HomePage from "../pages/HomePage";
import CourtListPage from "../pages/CourtListPage";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import BookingHistoryPage from "../pages/BookingHistoryPage";
import RequireAuth from "../components/auth/RequireAuth";
import BookingPage from "../pages/BookingPage";
import ProfilePage from "../pages/ProfilePage";
import MatchPage from "../pages/MatchPage";
import CreateMatchPage from "../pages/CreateMatchPage";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";
import PaymentResultPage from "../pages/PaymentResultPage";
import PolicyPage from "../pages/PolicyPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="/terms" element={<PolicyPage />} />
        <Route path="/privacy" element={<PolicyPage />} />
        <Route path="/refund-policy" element={<PolicyPage />} />
        <Route path="/payment/result" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
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
        <Route path="/matches/new" element={<RequireAuth><CreateMatchPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
