import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  CircleGauge,
  Clock3,
  Grid2X2,
  LogOut,
  MapPin,
  Settings,
  Users,
} from "lucide-react";
import logoLenKeo from "../assets/logo_len_keo.png";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getOwnerDashboard, type OwnerDashboardData } from "../services/ownerService";
import "./OwnerDashboardPage.css";

const statusLabels = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
} as const;

function localDateInput() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function OwnerDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(localDateInput);
  const [courtId, setCourtId] = useState("");
  const [dashboard, setDashboard] = useState<OwnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError("");

    getOwnerDashboard({ date, ...(courtId ? { courtId } : {}) })
      .then((response) => {
        if (!ignore) setDashboard(response.data);
      })
      .catch((requestError) => {
        if (!ignore) setError(getApiError(requestError).message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => { ignore = true; };
  }, [courtId, date]);

  const maxRevenue = Math.max(...(dashboard?.chart.map((item) => item.revenue) ?? [0]), 1);
  const totalBookings = useMemo(
    () => Object.values(dashboard?.statusCounts ?? {}).reduce((total, count) => total + count, 0),
    [dashboard],
  );
  const confirmed = (dashboard?.statusCounts.CONFIRMED ?? 0) + (dashboard?.statusCounts.PAID ?? 0);
  const pending = dashboard?.statusCounts.PENDING ?? 0;
  const completed = dashboard?.statusCounts.COMPLETED ?? 0;
  const cancelled = dashboard?.statusCounts.CANCELLED ?? 0;
  const donutStyle = {
    "--owner-confirmed": `${totalBookings ? (confirmed / totalBookings) * 360 : 0}deg`,
    "--owner-pending": `${totalBookings ? ((confirmed + pending) / totalBookings) * 360 : 0}deg`,
    "--owner-completed": `${totalBookings ? ((confirmed + pending + completed) / totalBookings) * 360 : 0}deg`,
  } as CSSProperties;

  function handleLogout() {
    signOut();
    navigate("/login", { replace: true });
  }

  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return (
      <main className="owner-access-denied">
        <h1>Khu vực dành cho chủ sân</h1>
        <p>Tài khoản hiện tại không có quyền truy cập bảng điều khiển này.</p>
        <Link to="/">Quay về trang chủ</Link>
      </main>
    );
  }

  return (
    <div className="owner-dashboard">
      <aside className="owner-sidebar">
        <Link className="owner-sidebar__brand" to="/">
          <img src={logoLenKeo} alt="" />
          <strong>Lên Kèo Thôi</strong>
        </Link>
        <nav aria-label="Quản lý chủ sân">
          <a className="is-active" href="#overview"><Grid2X2 />Tổng quan</a>
          <a href="#today-bookings"><CalendarDays />Lịch đặt sân</a>
          <a href="#field-status"><CircleGauge />Quản lý sân</a>
          <a href="#customers"><Users />Khách hàng</a>
          <a href="#revenue"><BarChart3 />Báo cáo</a>
          <a href="#settings"><Settings />Cài đặt</a>
        </nav>
        <div className="owner-sidebar__account">
          <span>{user.fullName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.fullName}</strong><small>Chủ sân</small></div>
        </div>
        <button type="button" onClick={handleLogout}><LogOut />Đăng xuất</button>
      </aside>

      <main className="owner-main" id="overview">
        <header className="owner-topbar">
          <div><span>Tổng quan vận hành</span><strong>Chào bạn, {user.fullName}!</strong></div>
          <div className="owner-topbar__controls">
            <label><MapPin />
              <select value={courtId} onChange={(event) => setCourtId(event.target.value)}>
                <option value="">Tất cả sân</option>
                {dashboard?.courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
              </select>
            </label>
            <label><CalendarDays /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <button className="owner-notification" type="button" aria-label="Thông báo"><Bell /><i /></button>
            <button className="owner-create" type="button"><CalendarPlus />Tạo booking</button>
          </div>
        </header>

        <div className="owner-main__body">
          {isLoading && <p className="owner-state">Đang tải dữ liệu vận hành...</p>}
          {error && <p className="owner-state is-error" role="alert">{error}</p>}

          {dashboard && !isLoading && (
            <>
              <section className="owner-stats" aria-label="Thống kê vận hành">
                <article><span>Doanh thu hôm nay</span><CircleDollarSign /><strong>{formatMoney(dashboard.stats.todayRevenue)}</strong><small className="is-positive">↗ Dữ liệu thực tế</small></article>
                <article><span>Doanh thu tháng này</span><CircleDollarSign /><strong>{formatMoney(dashboard.stats.monthRevenue)}</strong><small>Đã ghi nhận trong tháng</small></article>
                <article><span>Lượt đặt hôm nay</span><CalendarDays /><strong>{dashboard.stats.todayBookingCount} lượt</strong><small className="is-pending">{dashboard.stats.pendingCount} chờ xác nhận</small></article>
                <article><span>Sân đang trống</span><CircleGauge /><strong>{dashboard.stats.availableFieldCount}/{dashboard.stats.totalFieldCount} sân</strong><small>Cập nhật theo lịch đặt</small></article>
                <article><span>Tỷ lệ lấp đầy</span><BarChart3 /><strong>{dashboard.stats.occupancyRate}%</strong><small>Trong ngày đã chọn</small></article>
              </section>

              <section className="owner-analytics">
                <article className="owner-revenue-panel" id="revenue">
                  <header><h2>Doanh thu 7 ngày</h2><span>Kỳ này</span></header>
                  <div className="owner-revenue-chart">
                    {dashboard.chart.map((item) => (
                      <div key={item.date}>
                        <span title={formatMoney(item.revenue)} style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 5)}%` }} />
                        <small>{item.date.slice(5).split("-").reverse().join("/")}</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="owner-status-panel">
                  <h2>Trạng thái booking</h2>
                  <div className="owner-donut" style={donutStyle}><strong>{totalBookings}</strong><span>Tổng số</span></div>
                  <ul>
                    <li><i className="is-confirmed" />Đã xác nhận <strong>{confirmed}</strong></li>
                    <li><i className="is-pending" />Chờ xử lý <strong>{pending}</strong></li>
                    <li><i className="is-completed" />Hoàn thành <strong>{completed}</strong></li>
                    <li><i className="is-cancelled" />Đã hủy <strong>{cancelled}</strong></li>
                  </ul>
                </article>
              </section>

              <section className="owner-fields" id="field-status">
                <header><h2>Tình trạng sân hiện tại</h2><a href="#today-bookings">Xem tất cả</a></header>
                <div>
                  {dashboard.fieldStatuses.slice(0, 8).map((field) => (
                    <article className={`is-${field.state.toLowerCase()}`} key={field.id}>
                      <header><strong>{field.name}</strong><span>{field.state === "OCCUPIED" ? "Đang sử dụng" : field.state === "UPCOMING" ? "Sắp có khách" : "Trống"}</span></header>
                      <small>{field.courtName}</small>
                      {field.current && <p><Clock3 />{formatTime(field.current.startsAt)}–{formatTime(field.current.endsAt)}<br />{field.current.customerName}</p>}
                      {!field.current && field.next && <p><Clock3 />Khách tiếp theo {formatTime(field.next.startsAt)}<br />{field.next.customerName}</p>}
                      {!field.current && !field.next && <p>Sẵn sàng nhận booking</p>}
                    </article>
                  ))}
                </div>
              </section>

              <section className="owner-bookings" id="today-bookings">
                <header><h2>Lịch đặt sân hôm nay</h2><span>{dashboard.todayBookings.length} booking</span></header>
                <div className="owner-bookings__table-wrap">
                  <table>
                    <thead><tr><th>Mã đặt</th><th>Khách hàng</th><th>Sân</th><th>Khung giờ</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                      {dashboard.todayBookings.map((booking) => {
                        const slot = booking.slots[0];
                        return (
                          <tr key={booking.id}>
                            <td><strong>#{booking.id.slice(0, 8).toUpperCase()}</strong></td>
                            <td>{booking.user.fullName}<small>{booking.user.phone ?? "Chưa có SĐT"}</small></td>
                            <td>{slot?.courtField.name ?? booking.court.name}</td>
                            <td>{slot ? `${formatTime(slot.startsAt)}–${formatTime(slot.endsAt)}` : "—"}</td>
                            <td><strong>{formatMoney(booking.totalAmount)}</strong></td>
                            <td><span className={`owner-booking-status is-${booking.status.toLowerCase()}`}>{statusLabels[booking.status]}</span></td>
                          </tr>
                        );
                      })}
                      {dashboard.todayBookings.length === 0 && <tr><td colSpan={6} className="owner-bookings__empty">Chưa có booking trong ngày đã chọn.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default OwnerDashboardPage;
