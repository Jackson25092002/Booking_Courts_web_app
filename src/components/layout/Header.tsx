import type { MouseEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import logoLenKeo from "../../assets/logo_len_keo.png";
import "./Header.css";

function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  function handleHistoryClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isAuthenticated) return;

    event.preventDefault();
    navigate("/login", {
      state: {
        from: "/history",
        message: "Vui lòng đăng nhập để xem lịch sử đặt sân.",
      },
    });
  }

  return (
    <header className="header">
      <div className="header__container">
        <NavLink to="/" className="header__logo">
          <img
            src={logoLenKeo}
            alt="Logo Lên Kèo"
            className="header__logo-image"
          />
          <span>
            <strong>LÊN KÈO THÔI</strong>
            <small>Đặt sân nhanh, lên kèo chất</small>
          </span>
        </NavLink>

        <nav className="header__nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/courts"
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            Đặt sân
          </NavLink>
          <NavLink
            to="/matches"
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            Tìm kèo
          </NavLink>
          <NavLink
            to="/history"
            onClick={handleHistoryClick}
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            Lịch sử đặt sân
          </NavLink>
          <NavLink
            to="/owner"
            className={({ isActive }) =>
              isActive ? "header__link header__link--active" : "header__link"
            }
          >
            Dành cho chủ sân
          </NavLink>
        </nav>

        <div className="header__actions">
          {isAuthenticated && user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive
                    ? "header__user-name header__user-name--active"
                    : "header__user-name"
                }
                title={`Xem trang cá nhân của ${user.fullName}`}
                aria-label={`Trang cá nhân của ${user.fullName}`}
              >
                <CircleUserRound aria-hidden="true" />
                <span>{user.fullName}</span>
              </NavLink>
              <button className="header__logout" type="button" onClick={signOut}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="header__login">
                Đăng nhập
              </NavLink>
              <NavLink to="/register" className="header__register">
                Đăng ký
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
