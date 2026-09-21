import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bookmark,
  CircleCheck,
  Clock3,
  Filter,
  MapPin,
  Search,
  Share2,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getApiError } from "../services/api";
import { getMatches, type MatchItem, type MatchFilters } from "../services/matchService";
import "./MatchPage.css";

const mapCenter: [number, number] = [10.79, 106.67];

type MapStyle = "street" | "topographic";

/**
 * CẤU HÌNH NHÀ CUNG CẤP BẢN ĐỒ:
 * - Thay `url` và `attribution` tại đây nếu muốn dùng MapTiler, Mapbox, Google Maps...
 * - Với dịch vụ cần API key, khai báo key trong `.env`, ví dụ:
 *   VITE_MAP_TILE_KEY=your_key
 * - Sau đó ghép key bằng `import.meta.env.VITE_MAP_TILE_KEY` trong URL.
 * - Không ghi API key trực tiếp vào source code hoặc commit key thật lên GitHub.
 */
const MAP_TILE_PROVIDERS: Record<MapStyle, { url: string; attribution: string }> = {
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  topographic: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function createMarkerIcon(isSelected: boolean, remaining: number) {
  return L.divIcon({
    className: "match-map-marker-wrap",
    html: `<span class="match-map-marker${isSelected ? " is-selected" : ""}"><b>${remaining}</b></span>`,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -46],
  });
}

function MatchMapBounds({ matches }: { matches: MatchItem[] }) {
  const map = useMap();
  useEffect(() => {
    const points = matches.flatMap((match): [number, number][] =>
      match.court?.latitude != null && match.court.longitude != null
        ? [[match.court.latitude, match.court.longitude]] : []);
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    else map.setView(mapCenter, 12);
  }, [map, matches]);
  return null;
}

function MatchPage() {
  const location = useLocation();
  const createdMatchId = (location.state as { createdMatchId?: string } | null)?.createdMatchId;
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [level, setLevel] = useState("");
  const [date, setDate] = useState("");
  const [applied, setApplied] = useState<MatchFilters>({ sort: "soonest" });
  const [districts, setDistricts] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMatchIds, setSavedMatchIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("savedMatchIds") ?? "[]");
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [actionMessage, setActionMessage] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");
  const activeTileProvider = MAP_TILE_PROVIDERS[mapStyle];

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    setMatches([]);
    getMatches(applied, controller.signal)
      .then((response) => {
        if (ignore) return;
        setMatches(response.data);
        setDistricts(response.meta.districts);
        setLevels(response.meta.levels);
        setSelectedId(response.data[0]?.id ?? null);
      })
      .catch((requestError) => {
        if (!ignore) setError(getApiError(requestError).message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => { ignore = true; controller.abort(); };
  }, [applied, retry]);

  useEffect(() => {
    if (!location.hash.startsWith("#match-")) return;
    const id = location.hash.slice("#match-".length);
    if (!matches.some((match) => match.id === id)) return;
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById(`match-${id}`)?.scrollIntoView({ block: "nearest" }));
  }, [location.hash, matches]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const filteredMatches = matches;

  function applyFilters(event?: FormEvent, period: MatchFilters["period"] = date ? "all" : applied.period) {
    event?.preventDefault();
    setApplied({ search: search.trim() || undefined, district: district || undefined,
      level: level || undefined, date: period === "weekend" ? undefined : date || undefined,
      period, sort: applied.sort });
  }

  function resetFilters() {
    setSearch(""); setDistrict(""); setLevel(""); setDate("");
    setApplied({ sort: "soonest" });
  }

  function toggleSavedMatch(id: string) {
    const next = savedMatchIds.includes(id)
      ? savedMatchIds.filter((savedId) => savedId !== id)
      : [...savedMatchIds, id];
    try {
      window.localStorage.setItem("savedMatchIds", JSON.stringify(next));
      setSavedMatchIds(next);
      setActionMessage(savedMatchIds.includes(id) ? "Đã bỏ lưu kèo." : "Đã lưu kèo trên thiết bị này.");
    } catch {
      setActionMessage("Không thể lưu kèo trên thiết bị này.");
    }
  }

  async function shareMatch(id: string) {
    const url = `${window.location.origin}/matches#match-${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setActionMessage("Đã sao chép liên kết kèo.");
    } catch {
      setActionMessage("Không thể sao chép liên kết. Hãy kiểm tra quyền truy cập clipboard.");
    }
  }

  return (
    <div className="match-page">
      <form className="match-search-panel" aria-label="Tìm kiếm kèo" onSubmit={applyFilters}>
        <label className="match-filter-field">
          <MapPin aria-hidden="true" />
          <select aria-label="Quận/Huyện" value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">Chọn khu vực (Quận/Huyện)</option>
            {districts.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="match-filter-field">
          <Search aria-hidden="true" />
          <input aria-label="Tên kèo, sân hoặc địa chỉ" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên sân, địa chỉ hoặc tên kèo..." />
        </label>
        <label className="match-filter-field">
          <Filter aria-hidden="true" />
          <select aria-label="Trình độ" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Tất cả trình độ</option>
            {levels.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit"><Search aria-hidden="true" />Tìm kèo</button>

        <div className="match-quick-filters">
          <span><Filter />Bộ lọc</span>
          <button className={applied.period !== "weekend" && !applied.date ? "is-active" : ""} type="button"
            onClick={() => { setDate(""); setApplied({ ...applied, date: undefined, period: "all" }); }}>Đang mở</button>
          <button className={applied.period === "weekend" ? "is-active" : ""} aria-pressed={applied.period === "weekend"} type="button"
            onClick={() => { setDate(""); applyFilters(undefined, applied.period === "weekend" ? "all" : "weekend"); }}>Cuối tuần</button>
          <label className="match-date-filter">Ngày chơi
            <input type="date" aria-label="Ngày chơi" value={date}
              onChange={(event) => { setDate(event.target.value); }} />
          </label>
          <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>
        </div>
      </form>

      {createdMatchId && <p className="match-created-notice" role="status">Đăng kèo thành công. Bài đăng đã xuất hiện trong danh sách.</p>}
      {actionMessage && <p className="match-action-notice" role="status">{actionMessage}</p>}

      <section className="match-workspace">
        <div className="match-list-column">
          <header className="match-list-header">
            <h1>Kèo đang mở <span>({filteredMatches.length})</span></h1>
            <div className="match-list-header__actions"><select aria-label="Sắp xếp" value={applied.sort ?? "soonest"}
              onChange={(event) => setApplied({ ...applied, sort: event.target.value as MatchFilters["sort"] })}>
              <option value="soonest">Sớm nhất</option><option value="newest">Mới nhất</option>
            </select>
            <Link to="/matches/new" className="match-create-link">+ Đăng kèo</Link></div>
          </header>

          <div className="match-list">
            {isLoading && <p className="match-state" role="status">Đang tải danh sách kèo...</p>}
            {error && <div className="match-state is-error" role="alert"><p>{error}</p><button onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
            {!isLoading && !error && filteredMatches.length === 0 && (
              <p className="match-state">Không tìm thấy kèo phù hợp với bộ lọc.</p>
            )}

            {filteredMatches.map((match) => {
              const remaining = Math.max(match.maxPlayers - match.currentPlayers, 0);
              return (
                <article
                  className={`match-card${selectedId === match.id ? " is-selected" : ""}`}
                  key={match.id}
                  id={`match-${match.id}`}
                  tabIndex={0}
                  aria-label={match.title}
                  onFocus={() => setSelectedId(match.id)}
                  onClick={() => setSelectedId(match.id)}
                  onMouseEnter={() => setSelectedId(match.id)}
                >
                  <div className="match-card__badges">
                    <span className="match-card__type"><Zap aria-hidden="true" /> Khách vãng lai</span>
                    <span className="is-open"><CircleCheck aria-hidden="true" /> Còn {remaining} chỗ</span>
                    <time><b>{formatMatchDate(match.startsAt)}</b>{formatMatchTime(match.startsAt)}</time>
                  </div>
                  <h2>{match.title}</h2>
                  <p className="match-card__venue">{match.court?.name ?? "Địa điểm sẽ cập nhật"}</p>
                  <p className="match-card__location"><MapPin aria-hidden="true" />{match.court?.district ?? "Chưa có khu vực"}</p>
                  <div className="match-card__meta">
                    <span>Trình độ: {match.level}</span>
                    <span><Users aria-hidden="true" /> Cần {remaining} · Đã có {match.currentPlayers}</span>
                    <span><WalletCards aria-hidden="true" /> {match.court ? `Sân ${match.court.pricePerHour.toLocaleString("vi-VN")}đ/giờ` : "Giá sân chưa cập nhật"}</span>
                  </div>
                  {match.description && <p className="match-card__description" title={match.description}>{match.description}</p>}
                  <footer>
                    <div className="match-host">
                      {match.organizer.avatarUrl
                        ? <img src={match.organizer.avatarUrl} alt="" />
                        : <span>{getInitials(match.organizer.fullName)}</span>}
                      <div><strong>{match.organizer.fullName}</strong><small>Người tổ chức</small></div>
                    </div>
                    <div className="match-card__actions">
                      <button type="button" className={savedMatchIds.includes(match.id) ? "is-saved" : ""}
                        aria-label={savedMatchIds.includes(match.id) ? "Bỏ lưu kèo" : "Lưu kèo"}
                        aria-pressed={savedMatchIds.includes(match.id)} onClick={() => toggleSavedMatch(match.id)}>
                        <Bookmark aria-hidden="true" />
                      </button>
                      <button type="button" aria-label="Sao chép liên kết kèo" onClick={() => void shareMatch(match.id)}>
                        <Share2 aria-hidden="true" />
                      </button>
                      {match.court && <Link className="match-view-court" to={`/courts/${match.court.id}`}>Xem sân</Link>}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="match-map" aria-label="Bản đồ vị trí các kèo">
          {/* `mapCenter` là tâm mặc định; marker lấy latitude/longitude của sân từ API. */}
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom zoomControl={false}>
            <MatchMapBounds matches={matches} />
            <TileLayer
              key={mapStyle}
              attribution={activeTileProvider.attribution}
              url={activeTileProvider.url}
            />
            <ZoomControl position="topright" />
            {filteredMatches.map((match) => {
              if (match.court?.latitude == null || match.court.longitude == null) return null;
              const remaining = Math.max(match.maxPlayers - match.currentPlayers, 0);
              return (
                <Marker
                  key={match.id}
                  position={[match.court.latitude, match.court.longitude]}
                  icon={createMarkerIcon(selectedId === match.id, remaining)}
                  eventHandlers={{ click: () => {
                    setSelectedId(match.id);
                    document.getElementById(`match-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  } }}
                >
                  <Popup>
                    <strong>{match.title}</strong><br />
                    {match.court.name}<br />
                    <Clock3 size={13} /> {formatMatchTime(match.startsAt)} · còn {remaining} chỗ<br />
                    <Link to={`/courts/${match.court.id}`}>Xem sân</Link>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          <label className="match-map__style-picker">
            <span>Nền bản đồ</span>
            <select value={mapStyle} onChange={(event) => {
              setMapStyle(event.target.value as MapStyle);
            }}>
              <option value="street">Đường phố</option>
              <option value="topographic">Địa hình</option>
            </select>
          </label>
          {/* {tileFailed && (
            <div className="match-map__error" role="status">
              <strong>Không tải được nền bản đồ</strong>
              <span>Hãy kiểm tra Internet, DNS, VPN hoặc tiện ích chặn nội dung.</span>
              <button type="button" onClick={() => {
                setTileFailed(false);
                setMapStyle((current) => current === "street" ? "topographic" : "street");
              }}>Thử lại</button>
            </div>
          )} */}
        </aside>
      </section>
    </div>
  );
}

export default MatchPage;
