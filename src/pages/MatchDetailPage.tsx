import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Pencil, Ban, CircleStop, UserRound } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getMatch, getMatchMembership, joinMatch, leaveMatch, updateMatch, type MatchItem } from "../services/matchService";
import "./MatchDetailPage.css";

const labels = { OPEN: "Đang tuyển", FULL: "Đã đủ người", CLOSED: "Đã đóng tuyển", CANCELLED: "Đã hủy", COMPLETED: "Đã hoàn thành" };
export default function MatchDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const userId = user?.id;
  const location = useLocation();
  const [match, setMatch] = useState<MatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string>(location.state?.message || "");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<"close" | "cancel" | "join" | "leave" | null>(null);
  const [version, setVersion] = useState(0);
  const [joined, setJoined] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  useEffect(() => {
    let ignore = false;
    setJoined(false);
    setCheckingMembership(!!userId);
    if (userId) getMatchMembership(id)
      .then((r) => { if (!ignore) setJoined(r.data.joined); })
      .catch((e) => { if (!ignore) setError(getApiError(e).message); })
      .finally(() => { if (!ignore) setCheckingMembership(false); });
    return () => { ignore = true; };
  }, [id, userId]);
  async function handleJoin() {
    if (busy || joined) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await joinMatch(id);
      setJoined(true); setNotice(response.message); setPending(null);
      setVersion((v) => v + 1);
    } catch (e) { setError(getApiError(e).message); }
    finally { setBusy(false); }
  }
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
    if (pending === "join") { await handleJoin(); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      if (pending === "leave") {
        const response = await leaveMatch(id);
        setJoined(false); setNotice(response.message); setPending(null);
        setVersion((v) => v + 1);
        return;
      }
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
          {!owner && <div className="match-detail-actions">
            {!user ? <Link to="/login">Đăng nhập để tham gia</Link> :
              <button type="button" disabled={busy || checkingMembership || joined || !future || match.status !== "OPEN" || match.currentPlayers >= match.maxPlayers}
                onClick={() => setPending("join")}>
                {checkingMembership ? "Đang kiểm tra..." : joined ? "Đã tham gia" : busy ? "Đang tham gia..." : "Tham gia kèo"}
              </button>}
            {joined && future && !["CANCELLED", "COMPLETED"].includes(match.status) && <button type="button" className="is-danger" disabled={busy} onClick={() => setPending("leave")}>Hủy tham gia</button>}
          </div>}
          {!owner && (pending === "join" || pending === "leave") && <div className="match-detail-confirm" role="group" aria-label="Xác nhận tham gia kèo">
            <p>{pending === "join" ? "Bạn xác nhận tham gia buổi chơi này? Người tạo kèo sẽ nhận thông báo. Thao tác này không đặt sân hoặc thanh toán." : "Bạn muốn hủy tham gia? Người tạo kèo sẽ được thông báo. Việc này chỉ xóa bạn khỏi kèo, không hủy cả kèo."}</p>
            <button disabled={busy} onClick={() => void confirmAction()}>{busy ? "Đang xử lý..." : pending === "join" ? "Xác nhận tham gia" : "Xác nhận hủy tham gia"}</button>
            <button disabled={busy} onClick={() => setPending(null)}>Quay lại</button>
          </div>}
        </article>
        {manageable && <section className="match-detail-card match-detail-management">
          <h2>Quản lý kèo của bạn</h2>
          <p>Không bắt buộc đặt sân trước khi tạo kèo. Nếu chưa đủ người trong 8 tiếng trước giờ bắt đầu, hệ thống sẽ nhắc bạn cân nhắc tiếp tục tuyển, đóng tuyển hoặc hủy kèo; không tự động hủy.</p>
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
