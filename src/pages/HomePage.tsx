import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import courtImage from "../assets/home_page.jpg";
import { getApiError } from "../services/api";
import { getCourts, type Court } from "../services/courtService";
import { Clock3, HeartIcon, MapPin, Star } from "lucide-react";
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();
  const [recommendedCourts, setRecommendedCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadRecommendedCourts() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getCourts({
          sort: "rating",
          page: 1,
          limit: 4,
        });

        if (!shouldIgnore) {
          setRecommendedCourts(response.data);
        }
      } catch (requestError) {
        if (!shouldIgnore) {
          setError(getApiError(requestError).message);
          setRecommendedCourts([]);
        }
      } finally {
        if (!shouldIgnore) setIsLoading(false);
      }
    }

    void loadRecommendedCourts();

    return () => {
      shouldIgnore = true;
    };
  }, [requestVersion]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parameters = new URLSearchParams();
    const district = String(formData.get("district") ?? "");
    const date = String(formData.get("date") ?? "");
    const time = String(formData.get("time") ?? "");

    if (district) parameters.set("district", district);
    if (date) parameters.set("date", date);
    if (time) parameters.set("time", time);

    navigate(`/courts${parameters.size ? `?${parameters.toString()}` : ""}`);
  }

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__overlay" />

        <div className="hero__content">
          <p className="hero__eyebrow">Nền tảng cầu lông dành cho mọi người</p>

          <h1>
            Đặt sân nhanh chóng,
            <span> lên kèo dễ dàng</span>
          </h1>

          <p className="hero__description">
            Tìm kiếm sân cầu lông phù hợp, kiểm tra giờ trống và đặt sân chỉ trong vài phút.
          </p>

          <div className="hero__actions">
            <Link to="/courts" className="hero__primary-button">
              Tìm sân ngay
            </Link>

            <Link to="/matches" className="hero__secondary-button">
              Tìm kèo cầu lông
            </Link>
          </div>

          <form className="court-search" onSubmit={handleSearch}>
            <div className="court-search__field">
              <label htmlFor="location">Khu vực</label>

              <select id="location" name="district" defaultValue="">
                <option value="" disabled>
                  Chọn quận, huyện
                </option>
                <option value="Quận Phú Nhuận">Quận Phú Nhuận</option>
                <option value="Quận Tân Phú">Quận Tân Phú</option>
                <option value="Quận 10">Quận 10</option>
                <option value="Thành phố Thủ Đức">Thành phố Thủ Đức</option>
                <option value="Quận 1">Quận 1</option>
              </select>
            </div>

            <div className="court-search__field">
              <label htmlFor="date">Ngày chơi</label>
              <input id="date" name="date" type="date" />
            </div>

            {/* <div className="court-search__field">
              <label htmlFor="time">Khung giờ</label>
              <input id="time" name="time" type="time" />
            </div> */}

            <button type="submit" className="court-search__button">
              Tìm sân
            </button>
          </form>
        </div>
      </section>

      <section className="recommended-courts">
        <div className="section-heading">
          <div>
            <p>Sân cầu lông nổi bật</p>
            <h2>Sân được đề xuất</h2>
          </div>

          <Link to="/courts">Xem tất cả →</Link>
        </div>

        {isLoading ? (
          <div className="recommended-courts__status" role="status">
            Đang tải sân đề xuất...
          </div>
        ) : error ? (
          <div className="recommended-courts__status recommended-courts__status--error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRequestVersion((current) => current + 1)}>
              Thử lại
            </button>
          </div>
        ) : recommendedCourts.length > 0 ? (
          <div className="recommended-courts__grid">
            {recommendedCourts.map((court) => (
              <article className="recommended-court-card" key={court.id}>
                <div className="recommended-court-card__image">
                  <img src={court.imageUrl || courtImage} alt={`Không gian ${court.name}`} />
                  <span>{court.fields.length > 0 ? "Đang hoạt động" : "Tạm ngưng"}</span>
                  <button type="button" aria-label={`Yêu thích ${court.name}`}>
                    <HeartIcon />
                  </button>
                </div>

                <div className="recommended-court-card__body">
                  <h3>{court.name}</h3>
                  <p className="recommended-court-card__address"><MapPin size={20} aria-hidden="true" /> {court.address}</p>

                  <div className="recommended-court-card__meta">
                    <span className="recommended-court-card__rating">
                      <Star size={16} aria-hidden="true"/> 
                      <strong>{court.averageRating || "Mới"}</strong>
                    </span>
                    <span>{court.reviewCount} đánh giá</span>
                    <span>{court.fields.length} Sân </span>
                  </div>

                  <p className="recommended-court-card__hours">
                    <Clock3 size={16} aria-hidden="true" />
                    <span>
                    Giờ hoạt động: {court.openTime}–{court.closeTime}
                    </span>
                  </p>

                  <div className="recommended-court-card__footer">
                    <p>
                      Từ <strong>{court.pricePerHour.toLocaleString("vi-VN")}đ</strong>/giờ
                    </p>
                    <Link to={`/courts/${court.id}`}>Xem chi tiết</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="recommended-courts__status">
            Chưa có sân nào để đề xuất.
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
