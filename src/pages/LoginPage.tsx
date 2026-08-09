import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthIcon from "../components/auth/AuthIcon";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import logoLenKeo from "../assets/logo_len_keo.png";
import "./AuthPage.css";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as {
    successMessage?: string;
    message?: string;
    from?: string;
  } | null;
  const successMessage = routeState?.successMessage ?? routeState?.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await signIn({
        identifier: String(formData.get("identifier") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      navigate(routeState?.from || "/", { replace: true });
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

      <section className="auth-card" aria-labelledby="login-title">
        <nav className="auth-tabs" aria-label="Tài khoản">
          <Link to="/login" className="auth-tabs__item is-active" id="login-title">
            Đăng nhập
          </Link>
          <Link to="/register" className="auth-tabs__item">
            Đăng ký
          </Link>
        </nav>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__label" htmlFor="login-identifier">
            Email hoặc Số điện thoại
          </label>
          <div className="auth-input">
            <AuthIcon name="user" />
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              placeholder="Nhập email/SĐT của bạn"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-form__label-row">
            <label htmlFor="login-password">Mật khẩu</label>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
          <div className="auth-input">
            <AuthIcon name="lock" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="auth-input__visibility"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <AuthIcon name={showPassword ? "eye" : "eyeOff"} />
            </button>
          </div>

          {successMessage && (
            <p className="auth-form__success" role="status">{successMessage}</p>
          )}
          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="auth-divider"><span>hoặc tiếp tục với</span></div>

        <div className="auth-socials">
          <button type="button" className="auth-social auth-social--facebook">
            <strong>f</strong>
            Tiếp tục với Facebook
          </button>
          <button type="button" className="auth-social auth-social--google">
            <strong>G</strong>
            Tiếp tục với Google
          </button>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
