import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getApiError } from "../services/api";
import { getCourts, type Court } from "../services/courtService";
import { createMatch } from "../services/matchService";
import "./CreateMatchPage.css";

function CreateMatchPage() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [courtError, setCourtError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (currentPlayers >= maxPlayers) {
      setError("Số người đã có phải ít hơn tổng số người để còn chỗ tuyển.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await createMatch({
        courtId: String(data.get("courtId")),
        title: String(data.get("title")).trim(),
        description: String(data.get("description") ?? "").trim(),
        level: String(data.get("level")),
        startsAt: startTime.toISOString(),
        maxPlayers,
        currentPlayers,
      });
      navigate("/matches", { replace: true, state: { createdMatchId: response.data.id } });
    } catch (requestError) {
      const apiError = getApiError(requestError);
      setError(apiError.status === 401
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="create-match-page">
      <div className="create-match-page__container">
        <Link className="create-match-page__back" to="/matches">← Quay lại Tìm kèo</Link>
        <header>
          <h1>Đăng kèo cầu lông</h1>
          <p>Đăng thông tin buổi chơi để tìm thêm người cùng trình độ.</p>
        </header>
        <form className="create-match-form" onSubmit={handleSubmit}>
          <label>Tên kèo
            <input name="title" type="text" minLength={5} maxLength={150} required placeholder="Ví dụ: Giao lưu cầu lông tối thứ Bảy" />
          </label>
          <label><span className="create-match-form__label"><MapPin aria-hidden="true" /> Sân chơi</span>
            <select name="courtId" required disabled={loadingCourts || Boolean(courtError)} defaultValue="">
              <option value="">{loadingCourts ? "Đang tải danh sách sân..." : "Chọn sân"}</option>
              {courts.map((court) => <option key={court.id} value={court.id}>{court.name} — {court.district}</option>)}
            </select>
          </label>
          {courtError && <p role="alert" className="create-match-form__error">{courtError} <button type="button" onClick={() => setLoadVersion((value) => value + 1)}>Thử lại</button></p>}
          {!loadingCourts && !courtError && courts.length === 0 && <p>Chưa có sân đang hoạt động để chọn.</p>}
          <div className="create-match-form__row">
            <label><span className="create-match-form__label"><CalendarDays aria-hidden="true" /> Ngày giờ chơi (Việt Nam)</span>
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>Trình độ
              <select name="level" required defaultValue="">
                <option value="">Chọn trình độ</option>
                <option value="Mới chơi">Mới chơi</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khá">Khá</option>
                <option value="Giỏi">Giỏi</option>
              </select>
            </label>
          </div>
          <div className="create-match-form__row">
            <label><span className="create-match-form__label"><Users aria-hidden="true" /> Tổng số người</span>
              <input name="maxPlayers" type="number" min={2} max={20} defaultValue={4} required />
            </label>
            <label>Số người đã có (gồm bạn)
              <input name="currentPlayers" type="number" min={1} max={19} defaultValue={1} required />
            </label>
          </div>
          <label>Mô tả thêm (không bắt buộc)
            <textarea name="description" rows={4} maxLength={1000} placeholder="Lối chơi, cách liên hệ hoặc lưu ý cho người tham gia..." />
          </label>
          <p className="create-match-form__note">Đăng kèo không tự đặt sân. Hãy chắc chắn bạn đã sắp xếp được sân trước giờ chơi.</p>
          {error && <p className="create-match-form__error" role="alert">{error}</p>}
          <button className="create-match-form__submit" type="submit" disabled={submitting || loadingCourts || Boolean(courtError) || courts.length === 0}>
            {submitting ? "Đang đăng kèo..." : "Đăng tuyển người chơi"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default CreateMatchPage;
