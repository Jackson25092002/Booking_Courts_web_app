import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import api, { getApiError } from "../services/api";
import { useAuth } from "../contexts/useAuth";
import "./NotificationBell.css";
type Notice = { id: string; message: string; readAt: string | null; kind: string; matchId?: string | null };
export default function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    async function load() {
      if (!userId || inFlight || stopped) return;
      inFlight = true;
      try {
        const response = await api.get<{ data: { notifications: Notice[]; unreadCount: number } }>("/api/notifications");
        if (!stopped) { setItems(response.data.data.notifications); setCount(response.data.data.unreadCount); setError(""); }
      } catch (e) { if (!stopped) setError(getApiError(e).message); }
      finally { inFlight = false; }
    }
    setItems([]); setCount(0); setError("");
    void load(); const timer = setInterval(() => void load(), 5000);
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true; clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId, version]);
  async function read(item: Notice) {
    try {
      await api.patch("/api/notifications", { id: item.id });
      if (!item.readAt) { setCount((value) => Math.max(0, value - 1)); setItems((all) => all.map((notice) => notice.id === item.id ? { ...notice, readAt: new Date().toISOString() } : notice)); }
      setOpen(false);
    } catch (e) { setError(getApiError(e).message); }
  }
  return <div className="notification-bell">
    <button type="button" aria-label={`Thông báo, ${count} chưa đọc`} aria-expanded={open} onClick={() => { if (!open) setVersion((v) => v + 1); setOpen(!open); }}><Bell size={22} />{count > 0 && <span>{count}</span>}</button>
    {open && <div className="notification-bell__panel"><strong>Thông báo</strong>{error && <p role="alert">{error}</p>}{!error && !items.length && <p>Chưa có thông báo.</p>}{items.map((item) => <Link key={item.id} className={item.readAt ? "" : "is-unread"} to={item.matchId ? `/matches/${item.matchId}` : item.kind === "BOOKING_PAID" ? "/owner#paid-bookings" : "/history"} onClick={() => void read(item)}>{item.message}</Link>)}</div>}
  </div>;
}
