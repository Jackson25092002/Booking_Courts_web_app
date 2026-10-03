import { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";
import { useAuth } from "../contexts/useAuth";
type PaidBooking = { id: string; totalAmount: number; court: { name: string }; user: { fullName: string; phone: string | null }; slots: Array<{ id: string; startsAt: string; endsAt: string; courtField: { name: string } }> };
export default function OwnerPaidBookings({ onConfirmed }: { onConfirmed: () => void }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<PaidBooking[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    async function load() {
      if (!user || inFlight || stopped) return;
      inFlight = true;
      try { const r = await api.get<{ data: { bookings: PaidBooking[] } }>("/api/owner/bookings"); if (!stopped) { setBookings(r.data.data.bookings); setError(""); } }
      catch (e) { if (!stopped) setError(getApiError(e).message); }
      finally { inFlight = false; if (!stopped) setLoading(false); }
    }
    setBookings([]); setLoading(!!user); setError("");
    void load(); const timer = setInterval(() => void load(), 5000);
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true; clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [version, user?.id]);
  async function confirm(id: string) {
    setBusy(id); setMessage("");
    try { await api.post("/api/owner/bookings/confirm", { bookingId: id }); setMessage("Đã xác nhận lịch và gửi thông báo cho khách."); setVersion((v) => v + 1); onConfirmed(); }
    catch (e) { setError(getApiError(e).message); }
    finally { setBusy(null); }
  }
  const dateTime = (date: string) => new Date(date).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return <section className="owner-bookings" id="paid-bookings">
    <header><h2>Đã thanh toán — chờ xác nhận</h2><span>{bookings.length} đơn • tất cả ngày chơi</span></header>
    {message && <p role="status" className="owner-state">{message}</p>}
    {error && <p role="alert" className="owner-state">{error}</p>}
    {loading && <p className="owner-state">Đang tải đơn...</p>}
    {!loading && !error && !bookings.length && <p className="owner-state">Không có đơn đã thanh toán cần xác nhận.</p>}
    {bookings.map((booking) => <article className="owner-paid-booking" key={booking.id}>
      <h3>{booking.court.name} — #{booking.id.slice(0, 8)}</h3>
      <p>{booking.user.fullName} • {booking.user.phone || "Chưa có số điện thoại"}</p>
      {booking.slots.map((slot) => <p key={slot.id}>{slot.courtField.name}: {dateTime(slot.startsAt)} → {dateTime(slot.endsAt)}</p>)}
      <strong>Đã trả đủ {booking.totalAmount.toLocaleString("vi-VN")}đ</strong>
      <button type="button" disabled={busy !== null} onClick={() => void confirm(booking.id)}>{busy === booking.id ? "Đang xác nhận..." : "Xác nhận đặt sân"}</button>
    </article>)}
  </section>;
}
