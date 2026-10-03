import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logoLenKeo from "../assets/logo_len_keo.png";
import { getApiError } from "../services/api";
import { demoResetPassword, resetPassword } from "../services/authService";
import "./AuthPage.css";

function ResetPasswordPage({ requestVerification = false }: { requestVerification?: boolean }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const localDemo = import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    if (password !== formData.get("confirmPassword")) {
      setError("Mật khẩu xác nhận chưa trùng khớp.");
      return;
    }
    if (!token && !localDemo) {
      setError("Chức năng này chỉ dùng khi demo localhost.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      if (!token) {
        await demoResetPassword(email.trim(), password, String(formData.get("confirmPassword") ?? ""));
      } else {
        await resetPassword(token, password, email.trim());
      }
      navigate("/login", {
        replace: true,
        state: { successMessage: "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." },
      });
    } catch (requestError) {
      setError(getApiError(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="auth-page__logo" to="/" aria-label="Về trang chủ">
        <img src={logoLenKeo} alt="Lên Kèo Thôi" />
      </Link>
      <section className="auth-card auth-card--recovery" aria-labelledby="reset-password-title">
        <div className="auth-recovery__header">
          <h1 id="reset-password-title">Đặt lại mật khẩu</h1>
          <p>Nhập email đã đăng ký và mật khẩu mới.</p>
          <p>Mật khẩu mới cần có từ 8 đến 72 ký tự.</p>
        </div>
        {!token && (!localDemo || !requestVerification) ? (
          <div className="auth-form__error" role="alert">
            Chức năng đặt lại mật khẩu không qua email chỉ dùng khi demo localhost.
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__label" htmlFor="reset-email">Địa chỉ email</label>
            <div className="auth-input">
              <Mail aria-hidden="true" />
              <input id="reset-email" name="email" type="email" autoComplete="email"
                placeholder="Nhập email của tài khoản" value={email}
                onChange={(event) => setEmail(event.target.value)} maxLength={255} required />
            </div>
            <label className="auth-form__label" htmlFor="reset-password">Mật khẩu mới</label>
            <div className="auth-input">
              <LockKeyhole aria-hidden="true" />
              <input id="reset-password" name="password" type={showPassword ? "text" : "password"}
                autoComplete="new-password" placeholder="Nhập mật khẩu mới" minLength={8} maxLength={72} required />
              <button type="button" className="auth-input__visibility" aria-pressed={showPassword}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <label className="auth-form__label" htmlFor="reset-confirm-password">Xác nhận mật khẩu</label>
            <div className="auth-input">
              <LockKeyhole aria-hidden="true" />
              <input id="reset-confirm-password" name="confirmPassword" type={showConfirmation ? "text" : "password"}
                autoComplete="new-password" placeholder="Nhập lại mật khẩu" minLength={8} maxLength={72} required />
              <button type="button" className="auth-input__visibility" aria-pressed={showConfirmation}
                aria-label={showConfirmation ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                onClick={() => setShowConfirmation((current) => !current)}>
                {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Xác nhận"}
            </button>
          </form>
        )}
        <Link className="auth-recovery__back" to="/login"><ArrowLeft aria-hidden="true" /> Quay lại đăng nhập</Link>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
