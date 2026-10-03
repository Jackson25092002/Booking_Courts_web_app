import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX, Clock } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getVNPayStatus, reconcileVNPayPayment, type PaymentFeedback } from "../services/paymentService";
import "./PaymentResultPage.css";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const txnRef = params.get("txnRef") || "";
  const [status, setStatus] = useState("WAITING");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [feedback, setFeedback] = useState<PaymentFeedback | null>(null);
  const [responseCode, setResponseCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [version, setVersion] = useState(0);
  const reconciliation = useRef({ txnRef: "", nextAt: 0 });
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      if (!txnRef) {
        setError("Không thể xác minh thông tin trả về từ VNPay. Vui lòng kiểm tra lịch sử đặt sân.");
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        let data = await getVNPayStatus(txnRef);
        if (stopped) return;
        if (reconciliation.current.txnRef !== txnRef) reconciliation.current = { txnRef, nextAt: 0 };
        if (data.payment.status === "WAITING" && Date.now() >= reconciliation.current.nextAt) {
          reconciliation.current.nextAt = Date.now() + 5 * 60 * 1000;
          try {
            const result = await reconcileVNPayPayment(txnRef);
            if (stopped) return;
            if (result.nextReconcileAt) reconciliation.current.nextAt = new Date(result.nextReconcileAt).getTime();
          } catch (reconcileError) {
            // A missing/slow QueryDR response does not prove that payment failed.
            if (getApiError(reconcileError).status === 401) throw reconcileError;
          }
          data = await getVNPayStatus(txnRef);
        }
        if (stopped) return;
        setError("");
        setAmount(data.payment.amount);
        setBookingId(data.payment.bookingId);
        setStatus(data.payment.status);
        setConfirmedAt(data.payment.booking.confirmedAt);
        setFeedback(data.feedback);
        setResponseCode(data.payment.responseCode);
        const pending = data.payment.status === "WAITING" || (data.payment.status === "SUCCEEDED" && !data.payment.booking.confirmedAt);
        if (pending && ++attempts < 60) timer = setTimeout(() => void check(), data.payment.status === "WAITING" ? 5000 : 15000);
        else setChecking(false);
      } catch (requestError) {
        if (stopped) return;
        const apiError = getApiError(requestError);
        if (apiError.status === 401) {
          signOut();
          navigate("/login", { replace: true, state: { from: `/payment/result?txnRef=${encodeURIComponent(txnRef)}`, message: "Vui lòng đăng nhập để xem kết quả thanh toán." } });
        } else setError(apiError.message);
        setChecking(false);
      }
    }
    void check();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [txnRef, navigate, signOut, version]);

  const success = status === "SUCCEEDED" && !error;
  const failed = status === "FAILED" || Boolean(error);
  return <section className="payment-result">
    <div className="payment-result__card" aria-live="polite">
      {success ? <CircleCheck size={56} /> : failed ? <CircleX size={56} /> : <Clock size={56} />}
      <h1>{error ? "Không thể kiểm tra thanh toán" : success ? (confirmedAt ? "Chủ sân đã xác nhận đặt sân" : "Đang chờ chủ sân xác nhận") : feedback?.title || "Đang chờ xác nhận thanh toán"}</h1>
      <p>{error || (success ? (confirmedAt ? "Đã thanh toán thành công và chủ sân đã xác nhận lịch của bạn." : "Đã thanh toán thành công. Chủ sân đã được thông báo và sẽ xác nhận lịch đặt sân của bạn.") : feedback?.message || "Đang kiểm tra kết quả từ VNPay...")}</p>
      {!error && !success && feedback?.advice && <p className="payment-result__advice">{feedback.advice}</p>}
      {amount !== null && <strong>{amount.toLocaleString("vi-VN")}đ</strong>}
      {txnRef && <small>Mã giao dịch: {txnRef}</small>}
      {responseCode && !error && <small>Mã phản hồi VNPay: {responseCode}</small>}
      <div className="payment-result__actions">
        <Link to="/history">Xem lịch sử đặt sân</Link>
        {success && bookingId && <Link to={`/history/${bookingId}/receipt`}>Xem hóa đơn</Link>}
        {!error && feedback?.canRetry && <Link to="/history">Thanh toán lại đơn hiện tại</Link>}
        {!success && txnRef && <button type="button" disabled={checking} onClick={() => setVersion((value) => value + 1)}>{checking ? "Đang kiểm tra..." : "Kiểm tra lại"}</button>}
      </div>
    </div>
  </section>;
}
