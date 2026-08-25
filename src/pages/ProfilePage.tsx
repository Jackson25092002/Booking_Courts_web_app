import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarCheck2,
  Camera,
  CircleUserRound,
  ClipboardList,
  History,
  LogOut,
  MapPin,
  Pencil,
  Save,
  Star,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { getApiError } from "../services/api";
import {
  getCurrentUser,
  updateCurrentUser,
  type AuthUser,
  type ProfileStats,
  type UpdateProfileInput,
} from "../services/authService";
import "./ProfilePage.css";

const skillLabels = {
  A: "Chuyên nghiệp",
  B: "Khá giỏi",
  C: "Trung bình khá",
  D: "Phong trào/Mới chơi",
} as const;

const genderLabels: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

const emptyStats: ProfileStats = {
  bookingCount: 0,
  completedBookingCount: 0,
  reviewCount: 0,
};

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "UTC" })
    : "Chưa cập nhật";
}

function createFormState(user: AuthUser): UpdateProfileInput {
  return {
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl ?? null,
    gender: user.gender ?? null,
    birthDate: getDateInputValue(user.birthDate) || null,
    playDistrict: user.playDistrict ?? "",
    skillLevel: user.skillLevel ?? null,
  };
}

function ProfilePage() {
  const { user: authUser, signOut, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AuthUser | null>(authUser);
  const [stats, setStats] = useState<ProfileStats>(emptyStats);
  const [form, setForm] = useState<UpdateProfileInput | null>(
    authUser ? createFormState(authUser) : null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getCurrentUser();
        if (shouldIgnore) return;

        setProfile(response.data.user);
        setStats(response.data.stats);
        setForm(createFormState(response.data.user));
        updateUser(response.data.user);
      } catch (requestError) {
        if (!shouldIgnore) setError(getApiError(requestError).message);
      } finally {
        if (!shouldIgnore) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      shouldIgnore = true;
    };
  }, [updateUser]);

  function updateField<Key extends keyof UpdateProfileInput>(
    key: Key,
    value: UpdateProfileInput[Key],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancelEditing() {
    if (profile) setForm(createFormState(profile));
    setIsEditing(false);
    setError("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await updateCurrentUser(form);
      setProfile(response.data.user);
      setStats(response.data.stats);
      setForm(createFormState(response.data.user));
      updateUser(response.data.user);
      setSuccessMessage(response.message);
      setIsEditing(false);
    } catch (requestError) {
      setError(getApiError(requestError).message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  if (isLoading) {
    return <div className="profile-state" role="status">Đang tải thông tin cá nhân...</div>;
  }

  if (!profile || !form) {
    return (
      <div className="profile-state profile-state--error" role="alert">
        <h1>Không thể tải hồ sơ</h1>
        <p>{error || "Không tìm thấy thông tin tài khoản."}</p>
      </div>
    );
  }

  const memberYear = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : new Date().getFullYear();
  const selectedSkill = profile.skillLevel ?? "D";

  return (
    <div className="profile-page">
      <div className="profile-page__container">
        <aside className="profile-sidebar">
          <div className="profile-sidebar__identity">
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={`Ảnh đại diện của ${profile.fullName}`} />
              ) : (
                <span>{getInitials(profile.fullName)}</span>
              )}
            </div>
            <h1>{profile.fullName}</h1>
            <p>Trình độ: {skillLabels[selectedSkill]}</p>
            <span className="profile-sidebar__member">Thành viên từ {memberYear}</span>
          </div>

          <nav className="profile-sidebar__nav" aria-label="Điều hướng tài khoản">
            <a className="is-active" href="#personal-info"><CircleUserRound />Thông tin cá nhân</a>
            <Link to="/history"><History />Lịch sử đặt sân</Link>
            <Link to="/matches"><Target />Trình độ &amp; Kèo</Link>
            <span className="is-disabled" title="Tính năng đang phát triển"><WalletCards />Ví của tôi</span>
            <button type="button" onClick={handleSignOut}><LogOut />Đăng xuất</button>
          </nav>
        </aside>

        <main className="profile-content">
          <section className="profile-panel" id="personal-info">
            <header className="profile-panel__header">
              <h2><ClipboardList />Thông tin cá nhân</h2>
              {!isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)}><Pencil />Chỉnh sửa</button>
              ) : (
                <button className="is-cancel" type="button" onClick={cancelEditing}><X />Hủy</button>
              )}
            </header>

            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-fields">
                <label>
                  <span>Họ và tên</span>
                  {isEditing ? (
                    <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
                  ) : <strong>{profile.fullName}</strong>}
                </label>
                <label>
                  <span>Email</span>
                  <strong>{profile.email}</strong>
                </label>
                <label>
                  <span>Số điện thoại</span>
                  {isEditing ? (
                    <input value={form.phone ?? ""} onChange={(event) => updateField("phone", event.target.value || null)} placeholder="0901234567" />
                  ) : <strong>{profile.phone || "Chưa cập nhật"}</strong>}
                </label>
                <label>
                  <span>Giới tính</span>
                  {isEditing ? (
                    <select value={form.gender ?? ""} onChange={(event) => updateField("gender", (event.target.value || null) as AuthUser["gender"])}>
                      <option value="">Chưa chọn</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  ) : <strong>{profile.gender ? genderLabels[profile.gender] : "Chưa cập nhật"}</strong>}
                </label>
                <label>
                  <span>Ngày sinh</span>
                  {isEditing ? (
                    <input type="date" max={new Date().toISOString().slice(0, 10)} value={form.birthDate ?? ""} onChange={(event) => updateField("birthDate", event.target.value || null)} />
                  ) : <strong>{formatDate(profile.birthDate)}</strong>}
                </label>
                <label>
                  <span>Khu vực thường chơi</span>
                  {isEditing ? (
                    <input value={form.playDistrict} onChange={(event) => updateField("playDistrict", event.target.value)} placeholder="Ví dụ: Quận 7, TP.HCM" />
                  ) : <strong>{profile.playDistrict || "Chưa cập nhật"}</strong>}
                </label>
                {isEditing && (
                  <label className="profile-fields__wide">
                    <span>URL ảnh đại diện</span>
                    <div className="profile-avatar-input"><Camera /><input type="url" value={form.avatarUrl ?? ""} onChange={(event) => updateField("avatarUrl", event.target.value || null)} placeholder="https://..." /></div>
                  </label>
                )}
              </div>

              {error && <p className="profile-form__error" role="alert">{error}</p>}
              {successMessage && <p className="profile-form__success" role="status">{successMessage}</p>}
              {isEditing && (
                <button className="profile-form__save" type="submit" disabled={isSaving}>
                  <Save />{isSaving ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              )}
            </form>
          </section>

          <section className="profile-stats" aria-label="Thống kê tài khoản">
            <article><CalendarCheck2 /><span>Lượt đặt sân</span><strong>{stats.bookingCount}</strong></article>
            <article><BadgeCheck /><span>Đơn hoàn thành</span><strong>{stats.completedBookingCount}</strong></article>
            <article><Star /><span>Đánh giá đã viết</span><strong>{stats.reviewCount}</strong></article>
          </section>

          <section className="profile-panel profile-skill-panel">
            <header>
              <div><h2><Target />Cài đặt trình độ</h2><p>Chọn trình độ phù hợp để hệ thống gợi ý kèo chính xác hơn.</p></div>
            </header>
            <div className="profile-skill-options">
              {(Object.keys(skillLabels) as Array<keyof typeof skillLabels>).map((level) => (
                <button
                  type="button"
                  key={level}
                  className={(isEditing ? form.skillLevel : profile.skillLevel) === level ? "is-selected" : undefined}
                  disabled={!isEditing}
                  onClick={() => updateField("skillLevel", level)}
                >
                  <strong>Trình độ {level}</strong><span>{skillLabels[level]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="profile-tip">
            <MapPin />
            <div><strong>Đặt sân nhanh hơn</strong><p>Cập nhật khu vực thường chơi để ưu tiên các sân gần bạn.</p></div>
            <Link to="/courts">Tìm sân</Link>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ProfilePage;
