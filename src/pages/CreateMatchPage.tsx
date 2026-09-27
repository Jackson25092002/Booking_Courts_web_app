import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getApiError } from "../services/api";
import { getCourts, type Court } from "../services/courtService";
import { createMatch, getMatch, updateMatch, type MatchItem } from "../services/matchService";
import { useAuth } from "../contexts/useAuth";
import "./CreateMatchPage.css";

function CreateMatchPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchItem | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(Boolean(id));
  const [matchError, setMatchError] = useState("");
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [courtError, setCourtError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    setLoadingMatch(true);
    setMatchError("");
    getMatch(id).then((response) => { if (!ignore) setMatch(response.data); })
      .catch((e) => { if (!ignore) setMatchError(getApiError(e).message); })
      .finally(() => { if (!ignore) setLoadingMatch(false); });
    return () => { ignore = true; };
  }, [id]);

  useEffect(() => {
    let ignore = false;
    setLoadingCourts(true);
    setCourtError("");
    getCourts({ limit: 50 }).then((response) => {
      if (!ignore) setCourts(response.data);
    }).catch((requestError) => {
      if (!ignore) setCourtError(getApiError(requestError).message);
    }).finally(() => {
      if (!ignore) setLoadingCourts(false);
    });
    return () => { ignore = true; };
  }, [loadVersion]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    const startsAt = String(data.get("startsAt") ?? "");
    const startTime = new Date(`${startsAt}:00+07:00`);
    const maxPlayers = Number(data.get("maxPlayers"));
    const currentPlayers = Number(data.get("currentPlayers"));

    if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
      setError("Vui lòng chọn giờ chơi trong tương lai theo giờ Việt Nam.");
      return;
    }
    if (id ? currentPlayers > maxPlayers : currentPlayers >= maxPlayers) {
      setError(id ? "Số người đã có không được vượt tổng số người." : "Số người đã có phải ít hơn tổng số người để còn chỗ tuyển.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const input = {
        courtId: String(data.get("courtId")),
        title: String(data.get("title")).trim(),
        description: String(data.get("description") ?? "").trim(),
        level: String(data.get("level")),
        startsAt: startTime.toISOString(),
        maxPlayers,
        currentPlayers,
      };
      const response = id ? await updateMatch(id, { action: "edit", data: input }) : await createMatch(input);
      navigate(`/matches/${response.data.id}`, { replace: true, state: { message: id ? "Đã lưu thay đổi kèo." : "Đăng kèo thành công." } });
    } catch (requestError) {
      const apiError = getApiError(requestError);
      setError(apiError.status === 401
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMatch || (id && loadingCourts)) return <main className="create-match-page"><p>Đang tải kèo...</p></main>;
  if (id && (matchError || !match || match.organizer.id !== user?.id || ["CANCELLED", "COMPLETED"].includes(match.status) || new Date(match.startsAt) <= new Date())) {
    return <main className="create-match-page"><p role="alert">{matchError || "Bạn không thể chỉnh sửa kèo này."}</p><Link to={`/matches/${id}`}>Quay lại kèo</Link></main>;
  }
  const localStart = match ? new Date(new Date(match.startsAt).getTime() + 7 * 3600000).toISOString().slice(0, 16) : undefined;

  return (
    <main className="create-match-page">
      <div className="create-match-page__container">
        <Link className="create-match-page__back" to={id ? `/matches/${id}` : "/matches"}>← Quay lại {id ? "chi tiết kèo" : "Tìm kèo"}</Link>
        <header>
          <h1>{id ? "Chỉnh sửa kèo cầu lông" : "Đăng kèo cầu lông"}</h1>
          <p>Đăng thông tin buổi chơi để tìm thêm người cùng trình độ.</p>
        </header>
        <form key={id || "new"} className="create-match-form" onSubmit={handleSubmit}>
          <label>Tên kèo
            <input name="title" defaultValue={match?.title} type="text" minLength={5} maxLength={150} required placeholder="Ví dụ: Giao lưu cầu lông tối thứ Bảy" />
          </label>
          <label><span className="create-match-form__label"><MapPin aria-hidden="true" /> Sân chơi</span>
            <select name="courtId" required disabled={loadingCourts || Boolean(courtError)} defaultValue={match?.court?.id || ""}>
              <option value="">{loadingCourts ? "Đang tải danh sách sân..." : "Chọn sân"}</option>
              {courts.map((court) => <option key={court.id} value={court.id}>{court.name} — {court.district}</option>)}
            </select>
          </label>
          {courtError && <p role="alert" className="create-match-form__error">{courtError} <button type="button" onClick={() => setLoadVersion((value) => value + 1)}>Thử lại</button></p>}
          {!loadingCourts && !courtError && courts.length === 0 && <p>Chưa có sân đang hoạt động để chọn.</p>}
          <div className="create-match-form__row">
            <label><span className="create-match-form__label"><CalendarDays aria-hidden="true" /> Ngày giờ chơi (Việt Nam)</span>
              <input name="startsAt" type="datetime-local" defaultValue={localStart} required />
            </label>
            <label>Trình độ
              <select name="level" required defaultValue={match?.level || ""}>
                <option value="">Chọn trình độ</option>
                {match && !["Mới chơi", "Trung bình", "Khá", "Giỏi"].includes(match.level) && <option value={match.level}>{match.level}</option>}
                <option value="Mới chơi">Mới chơi</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khá">Khá</option>
                <option value="Giỏi">Giỏi</option>
              </select>
            </label>
          </div>
          <div className="create-match-form__row">
            <label><span className="create-match-form__label"><Users aria-hidden="true" /> Tổng số người</span>
              <input name="maxPlayers" type="number" min={2} max={20} defaultValue={match?.maxPlayers || 4} required />
            </label>
            <label>Số người đã có (gồm bạn)
              <input name="currentPlayers" type="number" min={1} max={id ? 20 : 19} defaultValue={match?.currentPlayers || 1} required />
            </label>
          </div>
          <label>Mô tả thêm (không bắt buộc)
            <textarea name="description" defaultValue={match?.description || ""} rows={4} maxLength={1000} placeholder="Lối chơi, cách liên hệ hoặc lưu ý cho người tham gia..." />
          </label>
          <p className="create-match-form__note">Đăng kèo không tự đặt sân. Hãy chắc chắn bạn đã sắp xếp được sân trước giờ chơi.</p>
          {error && <p className="create-match-form__error" role="alert">{error}</p>}
          <button className="create-match-form__submit" type="submit" disabled={submitting || loadingCourts || Boolean(courtError) || courts.length === 0}>
            {submitting ? "Đang lưu..." : id ? "Lưu thay đổi" : "Đăng tuyển người chơi"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default CreateMatchPage;
