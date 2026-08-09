import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import courtFallbackImage from "../assets/home_page.jpg";
import LocationPinIcon from "../components/icons/LocationPinIcon";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import {
  createBooking,
  getCourtAvailability,
  type AvailabilitySlot,
  type CourtAvailability,
} from "../services/bookingService";
import { getCourt, type CourtDetail } from "../services/courtService";
import "./BookingPage.css";

const DAY_NAMES = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
const SLOT_MINUTES = 30;

interface SelectionGroup {
  fieldId: string;
  fieldName: string;
  startsAt: string;
  endsAt: string;
  startLabel: string;
  slotCount: number;
  price: number;
}

function getSlotKey(fieldId: string, slotIndex: number) {
  return `${fieldId}:${slotIndex}`;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, amount: number) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + amount);
  return toDateValue(date);
}

function getTodayValue() {
  return toDateValue(new Date());
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatDisplayDate(value: string) {
  return parseDateValue(value).toLocaleDateString("vi-VN");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} phút`;
  if (remainingMinutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainingMinutes} phút`;
}

function formatCompactDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

function formatCompactCurrency(value: number) {
  return `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
}

function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut } = useAuth();
  const today = useMemo(getTodayValue, []);
  const [court, setCourt] = useState<CourtDetail | null>(null);
  const [availability, setAvailability] = useState<CourtAvailability | null>(null);
  const [weekStart, setWeekStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(() => new Set());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoadingCourt, setIsLoadingCourt] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courtError, setCourtError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  const visibleDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCourt() {
      if (!id) {
        setCourtError("Đường dẫn sân không hợp lệ.");
        setIsLoadingCourt(false);
        return;
      }

      setIsLoadingCourt(true);
      setCourtError("");

      try {
        const response = await getCourt(id);
        if (!shouldIgnore) setCourt(response.data);
      } catch (error) {
        if (!shouldIgnore) setCourtError(getApiError(error).message);
      } finally {
        if (!shouldIgnore) setIsLoadingCourt(false);
      }
    }

    void loadCourt();
    return () => {
      shouldIgnore = true;
    };
  }, [id]);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadAvailability() {
      if (!court) return;

      setIsLoadingAvailability(true);
      setAvailabilityError("");
      setBookingError("");
      setSelectedCells(new Set());

      try {
        const response = await getCourtAvailability(court.id, selectedDate, 0.5);
        if (!shouldIgnore) setAvailability(response.data);
      } catch (error) {
        if (!shouldIgnore) {
          setAvailability(null);
          setAvailabilityError(getApiError(error).message);
        }
      } finally {
        if (!shouldIgnore) setIsLoadingAvailability(false);
      }
    }

    void loadAvailability();
    return () => {
      shouldIgnore = true;
    };
  }, [availabilityVersion, court, selectedDate]);

  const timeColumns = availability?.fields[0]?.slots ?? [];
  const courtPrice = court?.pricePerHour ?? 0;
  const selectionGroups = useMemo<SelectionGroup[]>(() => {
    if (!availability) return [];

    const groups: SelectionGroup[] = [];

    for (const field of availability.fields) {
      const selectedIndices = field.slots
        .map((_, index) => index)
        .filter((index) => selectedCells.has(getSlotKey(field.id, index)));

      if (selectedIndices.length === 0) continue;

      let groupStart = selectedIndices[0]!;
      let previousIndex = selectedIndices[0]!;

      for (let index = 1; index <= selectedIndices.length; index += 1) {
        const currentIndex = selectedIndices[index];
        const continuesCurrentGroup = currentIndex === previousIndex + 1;

        if (continuesCurrentGroup) {
          previousIndex = currentIndex;
          continue;
        }

        const startSlot = field.slots[groupStart];
        const endSlot = field.slots[previousIndex];
        const slotCount = previousIndex - groupStart + 1;

        groups.push({
          fieldId: field.id,
          fieldName: field.name,
          startsAt: startSlot.startsAt,
          endsAt: endSlot.endsAt,
          startLabel: startSlot.label,
          slotCount,
          price: Math.round((courtPrice * slotCount * SLOT_MINUTES) / 60),
        });

        if (currentIndex !== undefined) {
          groupStart = currentIndex;
          previousIndex = currentIndex;
        }
      }
    }

    return groups;
  }, [availability, courtPrice, selectedCells]);
  const selectedCellCount = selectionGroups.reduce(
    (totalCount, group) => totalCount + group.slotCount,
    0,
  );
  const selectedDurationMinutes = selectedCellCount * SLOT_MINUTES;
  const total = Math.round((courtPrice * selectedDurationMinutes) / 60);

  function chooseDate(value: string) {
    setSelectedDate(value);
  }

  function chooseCustomDate(value: string) {
    if (!value) return;
    setWeekStart(value);
    setSelectedDate(value);
  }

  function chooseSlot(fieldId: string, slotIndex: number, slot: AvailabilitySlot) {
    if (!slot.available) return;
    const slotKey = getSlotKey(fieldId, slotIndex);

    setSelectedCells((current) => {
      const next = new Set(current);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
    setBookingError("");
  }

  async function submitBooking() {
    if (!court || selectionGroups.length === 0) {
      setBookingError("Vui lòng chọn ít nhất một khung giờ còn trống.");
      return;
    }

    if (!acceptedTerms) {
      setBookingError("Vui lòng đồng ý với điều khoản trước khi tiếp tục.");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `${location.pathname}${location.search}`,
          message: "Vui lòng đăng nhập để hoàn tất đặt sân.",
        },
      });
      return;
    }

    setIsSubmitting(true);
    setBookingError("");

    try {
      await createBooking({
        courtId: court.id,
        selections: selectionGroups.map((group) => ({
          courtFieldId: group.fieldId,
          startsAt: group.startsAt,
          endsAt: group.endsAt,
        })),
      });
      navigate("/history", {
        state: { successMessage: "Đặt sân thành công." },
      });
    } catch (error) {
      const apiError = getApiError(error);

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
        setBookingError(apiError.message);
        if (apiError.status === 409) {
          setAvailabilityVersion((current) => current + 1);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingCourt) {
    return <div className="booking-page-state" role="status">Đang tải thông tin sân...</div>;
  }

  if (courtError || !court) {
    return (
      <div className="booking-page-state booking-page-state--error" role="alert">
        <h1>Không thể mở trang đặt sân</h1>
        <p>{courtError || "Không tìm thấy sân."}</p>
        <Link to="/courts">Quay lại danh sách sân</Link>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-page__container">
        <nav className="booking-page__breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <Link to="/courts">Sân cầu lông</Link>
          <span>›</span>
          <strong>{court.name}</strong>
        </nav>

        <div className="booking-page__layout">
          <main className="booking-page__main">
            <section className="booking-court-summary">
              <img src={court.imageUrl || courtFallbackImage} alt={court.name} />
              <div>
                <h1>{court.name}</h1>
                <p className="booking-court-summary__meta">
                  <span className="booking-court-summary__location">
                    <LocationPinIcon />
                    {court.address}
                  </span>
                  <span>◷ {court.openTime} – {court.closeTime}</span>
                  <strong>Từ {formatCurrency(court.pricePerHour)}/giờ</strong>
                </p>
              </div>
            </section>

            <section className="booking-court-about" id="court-introduction">
              <div className="booking-court-about__heading">
                <div>
                  <p>Thông tin sân</p>
                  <h2>Giới thiệu {court.name}</h2>
                </div>
                <span>★ {court.averageRating || "Mới"} · {court.reviewCount} đánh giá</span>
              </div>

              <p className="booking-court-about__description">
                {court.description ||
                  `${court.name} là địa điểm cầu lông tại ${court.district}, phù hợp cho luyện tập, giao lưu và thi đấu. Sân hỗ trợ đặt lịch trực tuyến để người chơi chủ động lựa chọn khung giờ phù hợp.`}
              </p>

              <div className="booking-court-about__facts">
                <article>
                  <span aria-hidden="true">▦</span>
                  <div><small>Số sân con</small><strong>{court.fields.length} sân</strong></div>
                </article>
                <article>
                  <span aria-hidden="true">◷</span>
                  <div><small>Giờ hoạt động</small><strong>{court.openTime} – {court.closeTime}</strong></div>
                </article>
                <article>
                  <span aria-hidden="true">♙</span>
                  <div><small>Chủ sân</small><strong>{court.owner.fullName}</strong></div>
                </article>
                <article>
                  <LocationPinIcon />
                  <div><small>Khu vực</small><strong>{court.district}</strong></div>
                </article>
              </div>
            </section>

            <section className="booking-date-panel">
              <div className="booking-date-panel__heading">
                <div>
                  <h2>Chọn ngày chơi</h2>
                  <p>Chọn nhiều ô 30 phút trên một hoặc nhiều sân con.</p>
                </div>
                <label className="booking-date-picker">
                  <span>▣</span>
                  Chọn ngày khác
                  <input
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(event) => chooseCustomDate(event.target.value)}
                    aria-label="Chọn ngày khác"
                  />
                </label>
              </div>

              <div className="booking-date-list">
                {visibleDates.map((value) => {
                  const date = parseDateValue(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      className={selectedDate === value ? "is-selected" : undefined}
                      onClick={() => chooseDate(value)}
                    >
                      <span>{DAY_NAMES[date.getDay()]}</span>
                      <strong>{date.getDate()}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="booking-schedule-panel">
              {isLoadingAvailability ? (
                <div className="booking-schedule-state" role="status">Đang kiểm tra lịch trống...</div>
              ) : availabilityError ? (
                <div className="booking-schedule-state booking-schedule-state--error" role="alert">
                  <p>{availabilityError}</p>
                  <button type="button" onClick={() => setAvailabilityVersion((value) => value + 1)}>
                    Thử lại
                  </button>
                </div>
              ) : availability && availability.fields.length > 0 ? (
                <>
                  <div className="booking-timeline-wrap">
                    <table
                      className="booking-timeline"
                      style={{ minWidth: `${116 + timeColumns.length * 58}px` }}
                    >
                      <thead>
                        <tr>
                          <th>Sân</th>
                          {timeColumns.map((slot) => <th key={slot.startsAt}>{slot.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {availability.fields.map((field) => (
                          <tr key={field.id}>
                            <th>{field.name}</th>
                            {field.slots.map((slot, slotIndex) => {
                              const isSelected = selectedCells.has(
                                getSlotKey(field.id, slotIndex),
                              );

                              return (
                                <td key={slot.startsAt}>
                                  <button
                                    type="button"
                                    className={isSelected ? "is-selected" : undefined}
                                    disabled={!slot.available}
                                    onClick={() => chooseSlot(field.id, slotIndex, slot)}
                                    title={slot.available ? `${field.name}: ${slot.label}, ${formatCurrency(court.pricePerHour / 2)}` : `${field.name}: ${slot.label}, đã đặt`}
                                    aria-label={`${field.name}, ${slot.label}, ${slot.available ? "còn trống" : "đã đặt"}`}
                                  >
                                    {isSelected ? "✓" : slot.available ? formatCompactCurrency(court.pricePerHour / 2) : ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="booking-timeline-summary" aria-live="polite">
                    <strong>
                      Tổng giờ: {selectedDurationMinutes ? formatCompactDuration(selectedDurationMinutes) : "0h"}
                    </strong>
                    <span>Kéo thanh ngang hoặc cuộn để xem thêm giờ</span>
                    <strong>Tổng tiền: {formatCurrency(total)}</strong>
                  </div>

                  <div className="booking-schedule-legend" aria-label="Chú thích trạng thái">
                    <span><i className="is-available" /> Sân trống</span>
                    <span><i className="is-selected" /> Đang chọn</span>
                    <span><i className="is-booked" /> Đã đặt</span>
                  </div>
                </>
              ) : (
                <div className="booking-schedule-state">Sân chưa có sân con đang hoạt động.</div>
              )}
            </section>
          </main>

          <aside className="booking-checkout-card">
            <h2><span>⌑</span> Tóm tắt đặt sân</h2>

            <div className="booking-checkout-card__selection">
              {selectionGroups.length > 0 ? (
                <div className="booking-checkout-card__selection-list">
                  {selectionGroups.map((group) => (
                    <div className="booking-checkout-card__selection-item" key={`${group.fieldId}-${group.startsAt}`}>
                      <div>
                        <strong>{group.fieldName}</strong>
                        <span>
                          {formatDisplayDate(selectedDate)} · {group.startLabel} – {formatTime(group.endsAt)} ({formatDuration(group.slotCount * SLOT_MINUTES)})
                        </span>
                      </div>
                      <strong>{formatCurrency(group.price)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Chọn một hoặc nhiều ô 30 phút trên các sân con để tiếp tục.</p>
              )}
            </div>

            <div className="booking-checkout-card__prices">
              <p><span>Tiền sân</span><strong>{formatCurrency(total)}</strong></p>
              <p><span>Phí dịch vụ</span><strong>0đ</strong></p>
            </div>

            <p className="booking-checkout-card__total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(total)}</strong>
            </p>

            <label className="booking-checkout-card__terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                Tôi đã đọc và đồng ý với <u>Điều khoản dịch vụ</u> và <u>Chính sách hoàn tiền</u> của Lên Kèo Thôi.
              </span>
            </label>

            {bookingError && <p className="booking-checkout-card__error" role="alert">{bookingError}</p>}

            <button
              type="button"
              className="booking-checkout-card__submit"
              disabled={selectionGroups.length === 0 || !acceptedTerms || isSubmitting}
              onClick={() => void submitBooking()}
            >
              {isSubmitting ? "Đang tạo đơn..." : "Tiếp tục  →"}
            </button>
            <p className="booking-checkout-card__support">Hỗ trợ nhanh: 123456789 (08h – 22h)</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
