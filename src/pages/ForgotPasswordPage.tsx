import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import logoLenKeo from "../assets/logo_len_keo.png";
import { getApiError } from "../services/api";
import { requestPasswordReset } from "../services/authService";
import "./AuthPage.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
    } catch (requestError) {
      setError(getApiError(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--recovery">
      <Link className="auth-recovery__top-back" to="/login">
        <ArrowLeft aria-hidden="true" /> Quay lại đăng nhập
      </Link>
      <section className="auth-card auth-card--recovery" aria-labelledby="forgot-password-title">
        <Link className="auth-recovery__logo" to="/" aria-label="Về trang chủ">
          <img src={logoLenKeo} alt="Lên Kèo Thôi" />
        </Link>
        <div className="auth-recovery__header">
          <h1 id="forgot-password-title">Đặt lại mật khẩu</h1>
          <p>Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>
        </div>

        {message ? (
          <div className="auth-recovery__result" role="status">
            <Mail aria-hidden="true" />
            <strong>Kiểm tra email của bạn</strong>
            <p>{message}</p>
            <button type="button" onClick={() => setMessage("")}>Gửi lại</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__label" htmlFor="recovery-email">Địa chỉ email</label>
            <div className="auth-input">
              <Mail aria-hidden="true" />
              <input id="recovery-email" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
            </button>
          </form>
        )}

        <div className="auth-recovery__login">
          <span>Nhớ mật khẩu của bạn?</span>
          <Link to="/login">Đăng nhập tại đây</Link>
        </div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
