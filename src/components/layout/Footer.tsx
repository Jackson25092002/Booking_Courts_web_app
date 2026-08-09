import { Link } from "react-router-dom";
import logoLenKeo from "../../assets/logo_len_keo.png";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__content">
        <section className="footer__brand" aria-label="Lên Kèo Thôi">
          <div className="footer__brand-heading">
            <img src={logoLenKeo} alt="Logo Lên Kèo Thôi" />
            <h2>LÊN KÈO THÔI</h2>
          </div>
          <p>Đặt sân nhanh, lên kèo chất.</p>
        </section>

        <section className="footer__column">
          <h2>Liên kết</h2>
          <nav aria-label="Liên kết cuối trang">
            <Link to="/">Trang chủ</Link>
            <Link to="/courts">Danh sách sân</Link>
            <Link to="/matches">Lên kèo</Link>
            <Link to="/history">Lịch sử đặt sân</Link>
          </nav>
        </section>

        <section className="footer__column">
          <h2>Chính sách</h2>
          <nav aria-label="Chính sách và hỗ trợ">
            <Link to="/help">Trợ giúp</Link>
            <Link to="/terms">Điều khoản sử dụng</Link>
            <Link to="/privacy">Chính sách bảo mật</Link>
          </nav>
        </section>

        <section className="footer__column footer__contact">
          <h2>Liên hệ</h2>
          <a href="tel:123456789">
            <span aria-hidden="true">☎</span>
            123456789
          </a>
          <a href="mailto:hotro@lenkeothoi.vn">
            <span aria-hidden="true">✉</span>
            hotro@lenkeothoi.vn
          </a>
          <p>
            <span aria-hidden="true">⌖</span>
            Thành phố Hồ Chí Minh
          </p>
        </section>
      </div>

      <div className="footer__bottom">
        <p>© 2026 LÊN KÈO THÔI. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
