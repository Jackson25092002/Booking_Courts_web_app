import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import courtImage from "../assets/home_page.jpg";
import courtExteriorImage from "../assets/san_tan_phuc.jpg";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import {
  createBooking,
  getCourtAvailability,
  type CourtAvailability,
} from "../services/bookingService";
import {
  getCourt,
  getCourts,
  type Court,
  type CourtDetail,
} from "../services/courtService";
import "./CourtDetailPage.css";

function formatPrice(value: number) {
  return value.toLocaleString("vi-VN");
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CourtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut } = useAuth();
  const [court, setCourt] = useState<CourtDetail | null>(null);
  const [similarCourts, setSimilarCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getTodayValue());
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [bookingNotice, setBookingNotice] = useState("");
  const [availability, setAvailability] = useState<CourtAvailability | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCourt() {
      if (!id) {
        setError("Đường dẫn sân không hợp lệ.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const detailResponse = await getCourt(id);
        const detail = detailResponse.data;

        if (shouldIgnore) return;

        setCourt(detail);
        setSelectedFieldId(detail.fields[0]?.id ?? "");

        const similarResponse = await getCourts({
          district: detail.district,
          sort: "rating",
          page: 1,
          limit: 4,
        });

        if (!shouldIgnore) {
          setSimilarCourts(
            similarResponse.data.filter((item) => item.id !== detail.id).slice(0, 3),
          );
        }
      } catch (requestError) {
        if (!shouldIgnore) {
          setError(getApiError(requestError).message);
          setCourt(null);
        }
      } finally {
        if (!shouldIgnore) setIsLoading(false);
      }
    }

    void loadCourt();

    return () => {
      shouldIgnore = true;
    };
  }, [id, requestVersion]);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadAvailability() {
      if (!court) return;

      setIsAvailabilityLoading(true);
      setAvailabilityError("");
      setBookingNotice("");

      try {
        const response = await getCourtAvailability(
          court.id,
          selectedDate,
          duration,
        );

        if (shouldIgnore) return;

        setAvailability(response.data);
        const field =
          response.data.fields.find((item) => item.id === selectedFieldId) ??
          response.data.fields[0];
        const firstAvailableSlot = field?.slots.find((slot) => slot.available);

        setSelectedFieldId(field?.id ?? "");
        setSelectedTime(firstAvailableSlot?.startsAt ?? "");
      } catch (requestError) {
        if (!shouldIgnore) {
          setAvailability(null);
          setSelectedTime("");
          setAvailabilityError(getApiError(requestError).message);
        }
      } finally {
        if (!shouldIgnore) setIsAvailabilityLoading(false);
      }
    }

    void loadAvailability();

    return () => {
      shouldIgnore = true;
    };
  }, [availabilityVersion, court, duration, selectedDate, selectedFieldId]);

  const selectedAvailabilityField = useMemo(
    () => availability?.fields.find((field) => field.id === selectedFieldId),
    [availability, selectedFieldId],
  );

  const availableSlots = useMemo(
    () => selectedAvailabilityField?.slots.filter((slot) => slot.available) ?? [],
    [selectedAvailabilityField],
  );

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.startsAt === selectedTime),
    [availableSlots, selectedTime],
  );

  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: court?.reviews.filter((review) => review.rating === rating).length ?? 0,
      })),
    [court],
  );

  function changeField(fieldId: string) {
    setSelectedFieldId(fieldId);
    const field = availability?.fields.find((item) => item.id === fieldId);
    setSelectedTime(field?.slots.find((slot) => slot.available)?.startsAt ?? "");
  }

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    if (!court || !selectedSlot || !selectedFieldId) {
      setBookingNotice("Vui lòng chọn một khung giờ còn trống.");
      return;
    }

    setIsBooking(true);
    setBookingNotice("");

    try {
      await createBooking({
        courtId: court.id,
        courtFieldId: selectedFieldId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
      });
      navigate("/history", {
        state: { successMessage: "Đặt sân thành công." },
      });
    } catch (requestError) {
      const apiError = getApiError(requestError);

      if (apiError.status === 401) {
        signOut();
        navigate("/login", {
          replace: true,
          state: {
            from: `${location.pathname}${location.search}`,
            message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          },
        });
      } else {
        setBookingNotice(apiError.message);
        if (apiError.status === 409) {
          setAvailabilityVersion((current) => current + 1);
        }
      }
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return <div className="court-detail-state" role="status">Đang tải thông tin sân...</div>;
  }

  if (error || !court) {
    return (
      <div className="court-detail-state court-detail-state--error" role="alert">
        <h1>Không thể hiển thị sân</h1>
        <p>{error || "Không tìm thấy sân."}</p>
        <button type="button" onClick={() => setRequestVersion((current) => current + 1)}>
          Thử lại
        </button>
        <Link to="/courts">Quay lại danh sách sân</Link>
      </div>
    );
  }

  const displayImage = court.imageUrl || courtImage;
  const galleryImages = [displayImage, courtImage, courtExteriorImage, courtImage];
  const bookingTotal = court.pricePerHour * duration;
  const scheduleTimes = availability?.fields[0]?.slots.slice(0, 4) ?? [];

  return (
    <div className="court-detail-page">
      <div className="court-detail-page__container">
        <nav className="court-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <Link to="/courts">Tìm sân</Link>
          <span>›</span>
          <strong>{court.name}</strong>
        </nav>

        <section className="court-detail-gallery" aria-label="Hình ảnh sân">
          <img className="court-detail-gallery__main" src={galleryImages[0]} alt={court.name} />
          <img src={galleryImages[1]} alt={`Khu vực thi đấu tại ${court.name}`} />
          <img src={galleryImages[2]} alt={`Lối vào ${court.name}`} />
          <img src={galleryImages[3]} alt={`Không gian ${court.name}`} />
          <div className="court-detail-gallery__last">
            <img src={galleryImages[0]} alt={`Toàn cảnh ${court.name}`} />
            <span>▦&nbsp; Xem tất cả ảnh</span>
          </div>
        </section>

        <section className="court-detail-summary">
          <div>
            <h1>{court.name}</h1>
            <p>
              <span className="court-detail-summary__rating">★ {court.averageRating || "Mới"}</span>
              <span>({court.reviewCount} đánh giá)</span>
              <span className="court-detail-summary__open">● Đang mở cửa ({court.openTime}–{court.closeTime})</span>
              <span>⌖ {court.address}</span>
            </p>
          </div>
          <div className="court-detail-summary__actions">
            <button type="button" aria-label="Yêu thích sân">♡</button>
            <button type="button" aria-label="Chia sẻ sân">⌯</button>
            <button type="button">▧&nbsp; Xem bản đồ</button>
          </div>
        </section>

        <div className="court-detail-layout">
          <div className="court-detail-main">
            <section className="court-detail-panel court-detail-introduction">
              <h2>Giới thiệu</h2>
              <p>
                {court.description ||
                  `${court.name} là địa điểm cầu lông tại ${court.district}, phù hợp cho người chơi luyện tập và giao lưu.`}
              </p>
              <p>
                Sân do {court.owner.fullName} quản lý, hiện có {court.fields.length} sân con đang hoạt động.
              </p>
            </section>

            <section className="court-detail-section">
              <h2>Tiện ích sân</h2>
              <div className="court-detail-amenities">
                <div><span>▦</span><p>Sân trong nhà</p></div>
                <div><span>№</span><p>{court.fields.length} sân con</p></div>
                <div><span>◷</span><p>Mở đến {court.closeTime}</p></div>
                <div><span>✓</span><p>Đặt lịch trực tuyến</p></div>
                <div><span>★</span><p>{court.bookingCount} lượt đặt</p></div>
              </div>
            </section>

            <section className="court-detail-panel court-detail-schedule">
              <div className="court-detail-section-heading">
                <div>
                  <h2>Lịch sân ngày {selectedDate}</h2>
                  <p>Dữ liệu trống được cập nhật trực tiếp từ hệ thống.</p>
                </div>
                <div><span>● Trống&nbsp;&nbsp; ● Đã đặt</span></div>
              </div>

              <div className="court-detail-schedule__table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sân</th>
                      {scheduleTimes.map((slot) => <th key={slot.startsAt}>{slot.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {court.fields.map((field) => (
                      <tr key={field.id}>
                        <th>{field.name}</th>
                        {scheduleTimes.map((slot) => {
                          const fieldSlot = availability?.fields
                            .find((item) => item.id === field.id)
                            ?.slots.find((item) => item.startsAt === slot.startsAt);

                          return (
                            <td key={slot.startsAt}>
                              <span
                                className={fieldSlot?.available ? "is-available" : "is-unavailable"}
                                aria-label={`${field.name} lúc ${slot.label}: ${fieldSlot?.available ? "trống" : "đã đặt"}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="court-detail-reviews">
              <h2>Đánh giá &amp; Bình luận</h2>
              <div className="court-detail-rating-overview">
                <div>
                  <strong>{court.averageRating || "0.0"}</strong>
                  <span>{"★".repeat(Math.round(court.averageRating))}</span>
                  <p>Dựa trên {court.reviewCount} đánh giá</p>
                </div>
                <div className="court-detail-rating-bars">
                  {ratingDistribution.map(({ rating, count }) => (
                    <div key={rating}>
                      <span>{rating}</span>
                      <i><b style={{ width: `${court.reviewCount ? (count / court.reviewCount) * 100 : 0}%` }} /></i>
                    </div>
                  ))}
                </div>
              </div>

              <div className="court-detail-review-list">
                {court.reviews.length > 0 ? court.reviews.map((review) => (
                  <article key={review.id}>
                    <div className="court-detail-review__avatar">
                      {review.user.fullName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3>{review.user.fullName}</h3>
                      <time dateTime={review.createdAt}>
                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                      </time>
                      <p className="court-detail-review__stars">{"★".repeat(review.rating)}</p>
                      <p>{review.comment || "Người dùng chưa để lại bình luận."}</p>
                    </div>
                  </article>
                )) : (
                  <p className="court-detail-review-list__empty">Sân chưa có đánh giá nào.</p>
                )}
              </div>
            </section>

            {similarCourts.length > 0 && (
              <section className="court-detail-similar">
                <h2>Sân tương tự gần đây</h2>
                <div>
                  {similarCourts.map((item) => (
                    <Link to={`/courts/${item.id}`} key={item.id}>
                      <img src={item.imageUrl || courtImage} alt={item.name} />
                      <strong>{item.name}</strong>
                      <span>{item.district}</span>
                      <p>{formatPrice(item.pricePerHour)}đ/giờ</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="court-detail-sidebar">
            <form className="court-booking-card" onSubmit={handleBooking}>
              <p className="court-booking-card__price">
                <strong>{formatPrice(court.pricePerHour)}đ</strong>/giờ
              </p>

              <label>
                Ngày chơi
                <input
                  type="date"
                  value={selectedDate}
                  min={getTodayValue()}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>

              <div className="court-booking-card__row">
                <label>
                  Chọn sân
                  <select value={selectedFieldId} onChange={(event) => changeField(event.target.value)}>
                    {court.fields.map((field) => (
                      <option key={field.id} value={field.id}>{field.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Giờ bắt đầu
                  <select
                    value={selectedTime}
                    onChange={(event) => setSelectedTime(event.target.value)}
                    disabled={isAvailabilityLoading || availableSlots.length === 0}
                  >
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <option key={slot.startsAt} value={slot.startsAt}>{slot.label}</option>
                      ))
                    ) : (
                      <option value="">Không còn giờ trống</option>
                    )}
                  </select>
                </label>
              </div>

              <fieldset>
                <legend>Thời lượng (tiếng)</legend>
                <div className="court-booking-card__durations">
                  {[1, 2, 3].map((hours) => (
                    <button
                      type="button"
                      key={hours}
                      className={duration === hours ? "is-active" : undefined}
                      onClick={() => setDuration(hours)}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="court-booking-card__total">
                <p><span>Tiền sân ({duration}h)</span><strong>{formatPrice(bookingTotal)}đ</strong></p>
                <p><b>Thanh toán</b><strong>{formatPrice(bookingTotal)}đ</strong></p>
              </div>

              {isAvailabilityLoading && <p className="court-booking-card__notice">Đang kiểm tra lịch trống...</p>}
              {availabilityError && <p className="court-booking-card__notice court-booking-card__notice--error">{availabilityError}</p>}
              <button
                className="court-booking-card__submit"
                type="submit"
                disabled={!selectedFieldId || !selectedSlot || isBooking || isAvailabilityLoading}
              >
                {isBooking ? "Đang tạo đơn..." : "Đặt sân ngay"}
              </button>
              {bookingNotice && <p className="court-booking-card__notice" role="status">{bookingNotice}</p>}
            </form>

            <section className="court-location-card">
              <h2>Vị trí sân</h2>
              <div><span>⌖</span></div>
              <strong>{court.address}</strong>
              <p>{court.district}, TP. Hồ Chí Minh</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.address)}`} target="_blank" rel="noreferrer">
                Chỉ đường
              </a>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CourtDetailPage;
