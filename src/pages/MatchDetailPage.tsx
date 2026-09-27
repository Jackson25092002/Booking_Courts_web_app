import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Pencil, Ban, CircleStop, UserRound } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getMatch, updateMatch, type MatchItem } from "../services/matchService";
import "./MatchDetailPage.css";

const labels = { OPEN: "Đang tuyển", FULL: "Đã đủ người", CLOSED: "Đã đóng tuyển", CANCELLED: "Đã hủy", COMPLETED: "Đã hoàn thành" };
export default function MatchDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [match, setMatch] = useState<MatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string>(location.state?.message || "");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<"close" | "cancel" | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let ignore = false;
    setLoading(true); setError(""); setMatch(null); setPending(null);
    getMatch(id).then((r) => { if (!ignore) setMatch(r.data); })
      .catch((e) => { if (!ignore) setError(getApiError(e).message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id, version]);
  async function confirmAction() {
    if (!pending || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await updateMatch(id, { action: pending });
      setMatch(response.data);
      setNotice(pending === "close" ? "Đã đóng tuyển. Kèo vẫn giữ thông tin buổi chơi." : "Đã hủy kèo. Thao tác này không hủy hoặc hoàn tiền đơn đặt sân.");
      setPending(null);
    } catch (e) { setError(getApiError(e).message); }
    finally { setBusy(false); }
  }
  const owner = match?.organizer.id === user?.id;
  const future = match && new Date(match.startsAt).getTime() > Date.now();
  const manageable = owner && future && match && !["CANCELLED", "COMPLETED"].includes(match.status);
  return <main className="match-detail-page">
    <div className="match-detail-container">
      <Link className="match-detail-back" to="/matches"><ArrowLeft size={18} />Quay lại Tìm kèo</Link>
      {loading && <p role="status">Đang tải thông tin kèo...</p>}
      {error && <div className="match-detail-error" role="alert">{error} {!match && <button onClick={() => setVersion((v) => v + 1)}>Thử lại</button>}</div>}
      {notice && <p className="match-detail-notice" role="status">{notice}</p>}
      {!loading && match && <>
        <article className="match-detail-card">
          <span className={`match-detail-status is-${match.status.toLowerCase()}`}>{labels[match.status]}</span>
          <h1>{match.title}</h1>
          <div className="match-detail-facts">
            <p><CalendarDays />{new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(match.startsAt))}</p>
            <p><Users />Trình độ: {match.level} · Đã có {match.currentPlayers}/{match.maxPlayers} người</p>
            <p><MapPin />{match.court ? `${match.court.name} — ${match.court.address}` : "Địa điểm chưa cập nhật"}</p>
          </div>
          <h2>Thông tin buổi chơi</h2>
          <p className="match-detail-description">{match.description || "Người tổ chức chưa bổ sung mô tả."}</p>
          {match.status === "OPEN" && future && <p>Còn tuyển {Math.max(0, match.maxPlayers - match.currentPlayers)} người.</p>}
          {!future && <p>Buổi chơi đã đến giờ bắt đầu. Không còn mở tuyển.</p>}
          <div className="match-detail-host"><UserRound /><div><small>Người tổ chức</small><strong>{match.organizer.fullName}</strong></div></div>
          {match.court && <div className="match-detail-venue"><p>Giá sân tham khảo: {match.court.pricePerHour.toLocaleString("vi-VN")}đ/giờ — không phải phí tham gia mỗi người.</p><Link to={`/courts/${match.court.id}`}>Xem sân</Link></div>}
        </article>
        {manageable && <section className="match-detail-card match-detail-management">
          <h2>Quản lý kèo của bạn</h2>
          <div className="match-detail-actions">
            <Link to={`/matches/${id}/edit`}><Pencil size={18} />Sửa kèo</Link>
            {match.status !== "CLOSED" && <button disabled={busy} onClick={() => setPending("close")}><CircleStop size={18} />Đóng tuyển</button>}
            <button className="is-danger" disabled={busy} onClick={() => setPending("cancel")}><Ban size={18} />Hủy kèo</button>
          </div>
          {pending && <div className="match-detail-confirm" role="group" aria-label="Xác nhận thao tác">
            <p>{pending === "close" ? "Đóng tuyển sẽ gỡ kèo khỏi danh sách đang mở. Bạn vẫn xem và sửa được thông tin kèo." : "Bạn chắc chắn muốn hủy kèo? Không thể sửa lại sau khi hủy. Đơn đặt sân liên quan không bị hủy."}</p>
            <button disabled={busy} onClick={() => void confirmAction()}>{busy ? "Đang xử lý..." : "Xác nhận"}</button>
            <button disabled={busy} onClick={() => setPending(null)}>Quay lại</button>
          </div>}
        </section>}
      </>}
    </div>
  </main>;
}
