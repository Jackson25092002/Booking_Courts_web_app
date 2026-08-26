import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Filter,
  MapPin,
  Search,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import { getMatches, type MatchItem } from "../services/matchService";
import "./MatchPage.css";

const mapCenter: [number, number] = [10.79, 106.67];

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
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

function MatchPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [level, setLevel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;

    getMatches()
      .then((response) => {
        if (ignore) return;
        setMatches(response.data);
        setSelectedId(response.data[0]?.id ?? null);
      })
      .catch((requestError) => {
        if (!ignore) setError(getApiError(requestError).message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  const districts = useMemo(
    () => [...new Set(matches.map((match) => match.court?.district).filter(Boolean))] as string[],
    [matches],
  );

  const levels = useMemo(
    () => [...new Set(matches.map((match) => match.level))],
    [matches],
  );

  const filteredMatches = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return matches.filter((match) => {
      const haystack = `${match.title} ${match.court?.name ?? ""} ${match.court?.address ?? ""}`.toLocaleLowerCase("vi");
      return (!keyword || haystack.includes(keyword))
        && (!district || match.court?.district === district)
        && (!level || match.level === level);
    });
  }, [district, level, matches, search]);

  function handleJoin(match: MatchItem) {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: "/matches",
          message: "Vui lòng đăng nhập để tham gia kèo cầu lông.",
        },
      });
      return;
    }

    if (match.court) navigate(`/courts/${match.court.id}`);
  }

  return (
    <div className="match-page">
      <section className="match-search-panel" aria-label="Tìm kiếm kèo">
        <label className="match-filter-field">
          <MapPin aria-hidden="true" />
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">Chọn khu vực (Quận/Huyện)</option>
            {districts.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="match-filter-field">
          <Search aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên sân, địa chỉ hoặc tên kèo..." />
        </label>
        <label className="match-filter-field">
          <Filter aria-hidden="true" />
          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Tất cả trình độ</option>
            {levels.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="button"><Search />Tìm kèo</button>

        <div className="match-quick-filters">
          <span><Filter />Bộ lọc</span>
          <button className="is-active" type="button">● Đang mở</button>
          <button type="button">Cuối tuần</button>
          <button type="button">Khách vãng lai</button>
          <button type="button">Ghép cặp</button>
        </div>
      </section>

      <section className="match-workspace">
        <div className="match-list-column">
          <header className="match-list-header">
            <h1>Kèo đang mở <span>({filteredMatches.length})</span></h1>
            <select aria-label="Sắp xếp"><option>Sớm nhất</option><option>Mới nhất</option></select>
          </header>

          <div className="match-list">
            {isLoading && <p className="match-state">Đang tải danh sách kèo...</p>}
            {error && <p className="match-state is-error" role="alert">{error}</p>}
            {!isLoading && !error && filteredMatches.length === 0 && (
              <p className="match-state">Không tìm thấy kèo phù hợp với bộ lọc.</p>
            )}

            {filteredMatches.map((match) => {
              const remaining = Math.max(match.maxPlayers - match.currentPlayers, 0);
              return (
                <article
                  className={`match-card${selectedId === match.id ? " is-selected" : ""}`}
                  key={match.id}
                  onMouseEnter={() => setSelectedId(match.id)}
                >
                  <div className="match-card__badges">
                    <span><Zap />Khách vãng lai</span>
                    <span className="is-open">✓ Còn {remaining} chỗ</span>
                    <time><b>{formatMatchDate(match.startsAt)}</b>{formatMatchTime(match.startsAt)}</time>
                  </div>
                  <h2>{match.title}</h2>
                  <p><CalendarDays />{match.court?.name ?? "Địa điểm sẽ cập nhật"}</p>
                  <p><MapPin />{match.court?.address ?? "Chưa có địa chỉ"}</p>
                  <div className="match-card__meta">
                    <span>Trình độ: {match.level}</span>
                    <span><Users />Cần {remaining} (Đã có {match.currentPlayers})</span>
                    <span><WalletCards />{match.court ? `${Math.round(match.court.pricePerHour / 1000)}k/người` : "Thỏa thuận"}</span>
                  </div>
                  <footer>
                    <div className="match-host">
                      {match.organizer.avatarUrl
                        ? <img src={match.organizer.avatarUrl} alt="" />
                        : <span>{getInitials(match.organizer.fullName)}</span>}
                      <div><strong>{match.organizer.fullName}</strong><small>Người tổ chức</small></div>
                    </div>
                    <button type="button" onClick={() => handleJoin(match)}>Tham gia ngay</button>
                  </footer>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="match-map" aria-label="Bản đồ vị trí các kèo">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                  eventHandlers={{ click: () => setSelectedId(match.id) }}
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
          <div className="match-map__legend"><span>● Nhiều kèo</span><span>● Ít kèo</span><span>● Đang chọn</span></div>
        </aside>
      </section>
    </div>
  );
}

export default MatchPage;
