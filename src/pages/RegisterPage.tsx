import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthIcon from "../components/auth/AuthIcon";
import { getApiError } from "../services/api";
import { register } from "../services/authService";
import logoLenKeo from "../assets/logo_len_keo.png";
import { Phone } from "lucide-react";
import "./AuthPage.css";

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (password !== formData.get("confirmPassword")) {
      setError("Mật khẩu xác nhận chưa trùng khớp.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await register({
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        password,
      });
      navigate("/login", {
        replace: true,
        state: { successMessage: "Đăng ký thành công. Bạn có thể đăng nhập." },
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

      <section className="auth-card auth-card--register" aria-labelledby="register-title">
        <nav className="auth-tabs" aria-label="Tài khoản">
          <Link to="/login" className="auth-tabs__item">Đăng nhập</Link>
          <Link to="/register" className="auth-tabs__item is-active" id="register-title">
            Đăng ký
          </Link>
        </nav>

        <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
          <div className="auth-input">
            <Phone aria-hidden="true" />
            <input
              name="phone"
              type="tel"
              placeholder="Số điện thoại"
              autoComplete="tel"
              inputMode="tel"
              pattern="(?:\+84|0)[0-9]{9}"
              title="Nhập số điện thoại Việt Nam gồm 10 số, bắt đầu bằng 0"
              aria-label="Số điện thoại"
              required
            />
          </div>
          <div className="auth-input">
            <AuthIcon name="user" />
            <input
              name="fullName"
              type="text"
              placeholder="Họ và tên"
              autoComplete="name"
              aria-label="Họ và tên"
              required
            />
          </div>
          <div className="auth-input">
            <AuthIcon name="mail" />
            <input
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-label="Email"
              required
            />
          </div>
          
          <div className="auth-input">
            <AuthIcon name="lock" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              autoComplete="new-password"
              aria-label="Mật khẩu"
              minLength={8}
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
          <div className="auth-input">
            <AuthIcon name="lock" />
            <input
              name="confirmPassword"
              type={showConfirmation ? "text" : "password"}
              placeholder="Xác nhận mật khẩu"
              autoComplete="new-password"
              aria-label="Xác nhận mật khẩu"
              minLength={8}
              required
            />
            <button
              type="button"
              className="auth-input__visibility"
              onClick={() => setShowConfirmation((current) => !current)}
              aria-label={showConfirmation ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
            >
              <AuthIcon name={showConfirmation ? "eye" : "eyeOff"} />
            </button>
          </div>

          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        {/* <div className="auth-divider"><span>Hoặc tiếp tục với</span></div>

        <div className="auth-socials">
          <button type="button" className="auth-social auth-social--facebook">
            <strong>f</strong>
            Tiếp tục với Facebook
          </button>
          <button type="button" className="auth-social auth-social--google">
            <strong>G</strong>
            Tiếp tục với Google
          </button>
        </div> */}

        {/* <p className="auth-card__terms">
          Bằng cách đăng ký, bạn đồng ý với <Link to="/terms">Điều khoản</Link> và{" "}
          <Link to="/privacy">Chính sách</Link> của chúng tôi.
        </p> */}
      </section>
    </main>
  );
}

export default RegisterPage;
