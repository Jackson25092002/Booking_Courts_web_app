import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getBookingReceipt, type BookingReceipt, type BookingStatus } from "../services/bookingService";
import { startVNPayPayment } from "../services/paymentService";
import "./BookingReceiptPage.css";

const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Chưa thanh toán", CONFIRMED: "Đã xác nhận", PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy", COMPLETED: "Hoàn thành",
};
const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));

export default function BookingReceiptPage() {
  const { id = "" } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingReceipt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const paymentInFlight = useRef(false);
  useEffect(() => {
    setAcceptedTerms(false);
    setPaymentError("");
  }, [id, user?.id]);
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    setBooking(null); setLoading(true); setError("");
    async function load() {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const response = await getBookingReceipt(id);
        if (!stopped) { setBooking(response.data.booking); setError(""); }
      } catch (e) {
        if (stopped) return;
        const failure = getApiError(e);
        if (failure.status === 401) {
          signOut();
          navigate("/login", { replace: true, state: { from: `/history/${id}/receipt`, message: "Vui lòng đăng nhập lại để xem hóa đơn." } });
        } else setError(failure.message);
      } finally { inFlight = false; if (!stopped) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [id, user?.id, navigate, signOut, version]);
  const paid = booking?.payment?.status === "SUCCEEDED";
  const canPay = !!booking && ["PENDING", "CONFIRMED"].includes(booking.status)
    && !paid && booking.payment?.status !== "WAITING" && booking.payment?.responseCode !== "07"
    && booking.slots.length > 0 && booking.slots.every((slot) => new Date(slot.startsAt) > new Date());
  async function pay() {
    if (!booking || !canPay || !acceptedTerms || paymentInFlight.current) return;
    paymentInFlight.current = true;
    setPaying(true); setPaymentError("");
    try {
      const payment = await startVNPayPayment(booking.id);
      window.location.assign(payment.paymentUrl);
    } catch (e) {
      const failure = getApiError(e);
      if (failure.status === 401) {
        signOut();
        navigate("/login", { replace: true, state: { from: `/history/${id}/receipt`, message: "Vui lòng đăng nhập lại để thanh toán." } });
      } else {
        setPaymentError(failure.message);
      }
    } finally {
      paymentInFlight.current = false; setPaying(false);
    }
  }
  return <section className="booking-receipt-page">
    <div className="booking-receipt-container">
      <div className="booking-receipt-toolbar">
        <Link to="/history"><ArrowLeft size={18} />Lịch sử đặt sân</Link>
        {booking && !error && <button type="button" onClick={() => window.print()}><Printer size={18} />In hóa đơn / Lưu PDF</button>}
      </div>
      {loading && <p role="status">Đang tải hóa đơn đặt sân...</p>}
      {error && <div role="alert" className="booking-receipt-error"><p>{error}</p><button type="button" onClick={() => setVersion((v) => v + 1)}>Thử lại</button></div>}
      {!loading && booking && !error && <article className="booking-receipt">
        <header className="booking-receipt-heading">
          <div><span>LÊN KÈO THÔI</span><h1><ReceiptText size={28} />Hóa đơn đặt sân</h1><p>Ngày đặt: {dateTime(booking.createdAt)}</p></div>
          <span className={`booking-receipt-status ${paid ? "is-paid" : ""}`}>{paid ? "Đã thanh toán VNPay" : statusLabels[booking.status]}</span>
        </header>
        <p className="booking-receipt-id">Mã đơn: <strong>{booking.id.toUpperCase()}</strong></p>
        <div className="booking-receipt-parties">
          <section><h2>Khách hàng</h2><strong>{booking.user.fullName}</strong><p>{booking.user.email}</p><p>Số điện thoại: {booking.user.phone || "Chưa cập nhật"}</p></section>
          <section><h2>Thông tin sân</h2><strong>{booking.court.name}</strong><p>{booking.court.address}</p><p>{booking.court.district}</p></section>
        </div>
        <h2>Chi tiết khung giờ đã đặt</h2>
        <div className="booking-receipt-table-wrapper"><table>
          <thead><tr><th>Sân con</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thành tiền</th></tr></thead>
          <tbody>{booking.slots.map((slot) => <tr key={slot.id}><td>{slot.courtField.name}</td><td>{dateTime(slot.startsAt)}</td><td>{dateTime(slot.endsAt)}</td><td>{money(slot.price)}</td></tr>)}</tbody>
        </table></div>
        <div className="booking-receipt-total"><span>Tổng tiền đặt sân</span><strong>{money(booking.totalAmount)}</strong></div>
        {canPay && <section className="booking-receipt-checkout">
          <h2>Kiểm tra hóa đơn trước khi thanh toán</h2>
          <p>Vui lòng kiểm tra sân, khung giờ và tổng tiền ở trên. Hóa đơn này chưa được thanh toán. VNPay Sandbox là môi trường thử nghiệm.</p>
          <label><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={paying} />
            <span>Tôi xác nhận thông tin đặt sân và đồng ý với <Link to="/terms" target="_blank" rel="noopener noreferrer">Điều khoản dịch vụ</Link> và <Link to="/refund-policy" target="_blank" rel="noopener noreferrer">Chính sách hoàn tiền</Link>.</span>
          </label>
          <button type="button" disabled={!acceptedTerms || paying} onClick={() => void pay()}>{paying ? "Đang chuyển sang VNPay..." : "Thanh toán VNPay Sandbox"}</button>
        </section>}
        {paymentError && <p role="alert" className="booking-receipt-error">{paymentError}</p>}
        {!paid && booking.payment?.status === "WAITING" && <p className="booking-receipt-checkout">
          Giao dịch đang chờ xác nhận. Không thanh toán lại. <Link to={`/payment/result?txnRef=${encodeURIComponent(booking.payment.txnRef)}`}>Xem kết quả thanh toán</Link>
        </p>}
        <section className="booking-receipt-payment"><h2>Thông tin thanh toán</h2>
          <dl>
            <div><dt>Trạng thái</dt><dd>{paid ? "Thanh toán thành công" : booking.payment?.status === "FAILED" ? "Thanh toán không thành công" : booking.payment?.status === "WAITING" ? "Đang chờ xác nhận thanh toán" : "Chưa có giao dịch VNPay được ghi nhận"}</dd></div>
            {booking.payment && <>
              <div><dt>Mã tham chiếu</dt><dd>{booking.payment.txnRef}</dd></div>
              {booking.payment.transactionNo && <div><dt>Mã giao dịch VNPay</dt><dd>{booking.payment.transactionNo}</dd></div>}
              {booking.payment.bankCode && <div><dt>Ngân hàng</dt><dd>{booking.payment.bankCode}</dd></div>}
              {paid && <div><dt>Số tiền đã thanh toán</dt><dd>{money(booking.payment.amount)}</dd></div>}
              {paid && booking.payment.paidAt && <div><dt>Thời điểm ghi nhận thanh toán</dt><dd>{dateTime(booking.payment.paidAt)}</dd></div>}
            </>}
          </dl>
        </section>
        <section className="booking-receipt-confirmation"><h2>Xác nhận lịch đặt sân</h2>
          <p>{booking.status === "CANCELLED" ? "Đơn đặt sân đã bị hủy." : booking.confirmedAt ? `Chủ sân đã xác nhận lúc ${dateTime(booking.confirmedAt)}.` : paid ? "Đã thanh toán thành công — đang chờ chủ sân xác nhận lịch đặt sân." : "Chưa có xác nhận của chủ sân."}</p>
        </section>
        {booking.note && <section><h2>Ghi chú</h2><p className="booking-receipt-note">{booking.note}</p></section>}
      </article>}
    </div>
  </section>;
}
