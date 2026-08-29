import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import courtImage from "../assets/home_page.jpg";
import { getApiError } from "../services/api";
import {
  getCourts,
  type Court,
  type CourtSort,
} from "../services/courtService";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Map,
  MapPin,
  Search,
} from "lucide-react";
import "./CourtListPage.css";

const PAGE_SIZE = 4;
const MAX_PRICE = 500000;

interface AppliedFilters {
  search: string;
  district: string;
  maxPrice: number;
}

const initialFilters: AppliedFilters = {
  search: "",
  district: "",
  maxPrice: MAX_PRICE,
};

function CourtListPage() {
  const [searchParams] = useSearchParams();
  const initialDistrict = searchParams.get("district") ?? "";
  const initialSearch = searchParams.get("search") ?? "";
  const [courts, setCourts] = useState<Court[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(() => ({
    ...initialFilters,
    search: initialSearch,
    district: initialDistrict,
  }));
  const [sortBy, setSortBy] = useState<CourtSort>("newest");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadCourts() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getCourts({
          search: appliedFilters.search || undefined,
          district: appliedFilters.district || undefined,
          maxPrice: appliedFilters.maxPrice,
          sort: sortBy,
          page: 1,
          limit: 50,
        });

        if (shouldIgnore) return;

        setCourts(response.data);
        setDistricts((current) =>
          Array.from(
            new Set([...current, ...response.data.map((court) => court.district)]),
          ).sort((first, second) => first.localeCompare(second, "vi")),
        );
      } catch (requestError) {
        if (!shouldIgnore) {
          setError(getApiError(requestError).message);
          setCourts([]);
        }
      } finally {
        if (!shouldIgnore) setIsLoading(false);
      }
    }

    void loadCourts();

    return () => {
      shouldIgnore = true;
    };
  }, [appliedFilters, requestVersion, sortBy]);

  const filteredCourts = courts;

  const totalPages = Math.max(1, Math.ceil(filteredCourts.length / PAGE_SIZE));
  const visibleCourts = filteredCourts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: search.trim(),
      district: selectedDistrict,
      maxPrice,
    });
  }

  function toggleDistrict(district: string) {
    setSelectedDistrict((current) => (current === district ? "" : district));
  }

  function resetFilters() {
    setSearch("");
    setSelectedDistrict("");
    setMaxPrice(MAX_PRICE);
    setPage(1);
    setAppliedFilters(initialFilters);
  }

  function changeSort(value: CourtSort) {
    setSortBy(value);
    setPage(1);
  }

  return (
    <div className="court-list-page">
      <div className="court-list-page__container">
        <nav className="court-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight aria-hidden="true" />
          <strong>Danh sách sân</strong>
        </nav>

        <form className="court-search-panel" onSubmit={applyFilters}>
          <label>
            <span>Tên sân hoặc địa chỉ</span>
            <span className="court-search-panel__control">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm sân"
                aria-label="Tên sân hoặc địa chỉ"
              />
            </span>
          </label>
          <label>
            <span>Ngày</span>
            <input type="date" aria-label="Ngày chơi" />
          </label>
          <label>
            <span>Giờ bắt đầu</span>
            <input type="time" aria-label="Giờ bắt đầu" />
          </label>
          <label>
            <span>Thời lượng</span>
            <select defaultValue="1.5" aria-label="Thời lượng chơi">
              <option value="1">1 giờ</option>
              <option value="1.5">1.5 giờ</option>
              <option value="2">2 giờ</option>
              <option value="2.5">2.5 giờ</option>
              <option value="3">3 giờ</option> 
            </select>
          </label>
          <button type="submit">
            <Search aria-hidden="true" />
            Tìm kiếm
          </button>
        </form>

        <div className="court-results-layout">
          <aside className="court-filters">
            <div className="court-filters__heading">
              <h2>Bộ lọc tìm kiếm</h2>
              <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>
            </div>

            <fieldset>
              <legend>
                <MapPin aria-hidden="true" />
                Quận/Huyện
              </legend>
              {districts.map((district) => (
                <label key={district} className="court-filter-option">
                  <input
                    type="checkbox"
                    checked={selectedDistrict === district}
                    onChange={() => toggleDistrict(district)}
                  />
                  <span>{district}</span>
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>
                <Banknote aria-hidden="true" />
                Khoảng giá (VNĐ/giờ)
              </legend>
              <input
                className="court-price-range"
                type="range"
                min="50000"
                max={MAX_PRICE}
                step="10000"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <div className="court-price-labels">
                <span>50k</span>
                <strong>{Math.round(maxPrice / 1000)}k</strong>
              </div>
            </fieldset>

            {/* <fieldset>
              <legend>⌁&nbsp; Sân con</legend>
              <span className="court-filter-note">
                Thông tin sân con được lấy trực tiếp từ hệ thống.
              </span>
            </fieldset> */}

            <button className="court-filters__apply" type="button" onClick={() => applyFilters()}>
              Áp dụng bộ lọc
            </button>
          </aside>

          <main className="court-results">
            <div className="court-results__toolbar">
              <div>
                <h1>
                  Kết quả tìm kiếm: <span>{filteredCourts.length} sân</span>
                </h1>
                <p>Dữ liệu sân được cập nhật từ hệ thống</p>
              </div>
              <div className="court-results__view-controls">
                <button type="button" className="is-active" aria-label="Xem dạng danh sách">
                  <List aria-hidden="true" />
                </button>
                <button type="button" aria-label="Xem trên bản đồ">
                  <Map aria-hidden="true" />
                </button>
                <select
                  value={sortBy}
                  onChange={(event) => changeSort(event.target.value as CourtSort)}
                  aria-label="Sắp xếp sân"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá thấp nhất</option>
                  <option value="price-desc">Giá cao nhất</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="court-results__status" role="status">
                Đang tải danh sách sân...
              </div>
            ) : error ? (
              <div className="court-results__status court-results__status--error" role="alert">
                <h2>Không thể tải danh sách sân</h2>
                <p>{error}</p>
                <button type="button" onClick={() => setRequestVersion((current) => current + 1)}>
                  Thử lại
                </button>
              </div>
            ) : visibleCourts.length > 0 ? (
              <div className="court-card-grid">
                {visibleCourts.map((court) => (
                  <article className="court-card" key={court.id}>
                    <div className="court-card__image">
                      <img
                        src={court.imageUrl || courtImage}
                        alt={`Không gian ${court.name}`}
                      />
                    </div>

                    <div className="court-card__body">
                      <div className="court-card__title-row">
                        <h2>{court.name}</h2>
                        <p><strong>{Math.round(court.pricePerHour / 1000)}k</strong>/giờ</p>
                      </div>
                      <p className="court-card__address">
                        <MapPin aria-hidden="true" />
                        {court.address}
                      </p>

                      <div className="court-card__amenities" aria-label="Danh sách sân con">
                        <span className="court-card__field-label">Số sân</span>
                        <small>{court.fields.length} sân con</small>
                      </div>

                      <h3 className="court-card__hours-heading">
                        <Clock3 aria-hidden="true" />
                        Giờ hoạt động:
                      </h3>
                      <div className="court-card__slots">
                        <span>{court.openTime}</span>
                        <span>{court.closeTime}</span>
                      </div>

                      <div className="court-card__actions">
                        <Link className="court-card__details" to={`/courts/${court.id}`}>
                          Xem chi tiết
                        </Link>
                        {court.fields.length > 0 ? (
                          <Link className="court-card__booking" to={`/courts/${court.id}`}>
                            Đặt ngay
                          </Link>
                        ) : (
                          <button type="button" disabled>Đặt ngay</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="court-results__empty">
                <h2>Không tìm thấy sân phù hợp</h2>
                <p>Hãy thay đổi từ khóa, khu vực hoặc mức giá.</p>
              </div>
            )}

            {!isLoading && !error && filteredCourts.length > 0 && (
              <nav className="court-pagination" aria-label="Phân trang">
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={page === pageNumber ? "is-active" : undefined}
                      aria-current={page === pageNumber ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default CourtListPage;
