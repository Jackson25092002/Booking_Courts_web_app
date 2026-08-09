import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import courtImage from "../assets/home_page.jpg";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import {
  getMyBookings,
  type Booking,
  type BookingStatus,
} from "../services/bookingService";
import "./BookingHistoryPage.css";

const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const successMessage = (
    location.state as { successMessage?: string } | null
  )?.successMessage;

  useEffect(() => {
    let shouldIgnore = false;

    async function loadBookings() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getMyBookings();
        if (!shouldIgnore) setBookings(response.data.bookings);
      } catch (requestError) {
        if (shouldIgnore) return;

        const apiError = getApiError(requestError);

        if (apiError.status === 401) {
          signOut();
          navigate("/login", {
            replace: true,
            state: {
              from: "/history",
              message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            },
          });
          return;
        }

        setError(apiError.message);
      } finally {
        if (!shouldIgnore) setIsLoading(false);
      }
    }

    void loadBookings();

    return () => {
      shouldIgnore = true;
    };
  }, [navigate, requestVersion, signOut]);

  return (
    <div className="booking-history-page">
      <div className="booking-history-page__container">
        <nav className="booking-history-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <strong>Lịch sử đặt sân</strong>
        </nav>

        <header className="booking-history-heading">
          <div>
            <p>Đơn đặt sân của bạn</p>
            <h1>Lịch sử đặt sân</h1>
          </div>
          <Link to="/courts">Đặt sân mới</Link>
        </header>

        {successMessage && (
          <p className="booking-history-message" role="status">{successMessage}</p>
        )}

        {isLoading ? (
          <div className="booking-history-state" role="status">Đang tải lịch sử đặt sân...</div>
        ) : error ? (
          <div className="booking-history-state booking-history-state--error" role="alert">
            <h2>Không thể tải lịch sử</h2>
            <p>{error}</p>
            <button type="button" onClick={() => setRequestVersion((current) => current + 1)}>
              Thử lại
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="booking-history-state">
            <h2>Bạn chưa có đơn đặt sân</h2>
            <p>Chọn một sân phù hợp và bắt đầu đặt lịch.</p>
            <Link to="/courts">Tìm sân ngay</Link>
          </div>
        ) : (
          <div className="booking-history-list">
            {bookings.map((booking) => (
                <article className="booking-history-card" key={booking.id}>
                  <img src={booking.court.imageUrl || courtImage} alt={booking.court.name} />
                  <div className="booking-history-card__content">
                    <div className="booking-history-card__top">
                      <div>
                        <span className={`booking-status booking-status--${booking.status.toLowerCase()}`}>
                          {statusLabels[booking.status]}
                        </span>
                        <h2>{booking.court.name}</h2>
                      </div>
                      <strong>{booking.totalAmount.toLocaleString("vi-VN")}đ</strong>
                    </div>

                    <p className="booking-history-card__address">⌖ {booking.court.address}</p>
                    <div className="booking-history-card__slot-list">
                      {booking.slots.map((slot) => (
                        <div className="booking-history-card__details" key={slot.id}>
                          <p><span>Sân con</span><strong>{slot.courtField.name}</strong></p>
                          <p><span>Bắt đầu</span><strong>{formatDateTime(slot.startsAt)}</strong></p>
                          <p><span>Kết thúc</span><strong>{formatDateTime(slot.endsAt)}</strong></p>
                        </div>
                      ))}
                    </div>

                    <div className="booking-history-card__footer">
                      <small>Mã đơn: {booking.id.slice(0, 8).toUpperCase()}</small>
                      <Link to={`/courts/${booking.court.id}`}>Xem sân</Link>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingHistoryPage;
