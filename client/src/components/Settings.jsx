import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  RotateCcw,
  Save,
  Lock,
  Palette,
  Moon,
  Sun,
  Sparkles,
  Check,
  Bell,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  User,
  ShieldCheck,
  Sliders,
  Terminal,
  Image as ImageIcon,
  X,
  Droplets,
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import { useTheme } from "../context/ThemeContext";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

function Settings({
  currentUser,
  onUpdateProfile,
  onChangePassword,
  onUpdateAvatar,
  onDeleteAccount,
  showToast,
  onLogout: _onLogout,
}) {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    uiRadius,
    setUiRadius,
    lightTone,
    setLightTone,
    darkTone,
    setDarkTone,
    glassTone,
    setGlassTone,
    glassBlur,
    setGlassBlur,
    glassOpacity,
    setGlassOpacity,
    glassMotion,
    setGlassMotion,
    tetEffectsEnabled,
    setTetEffectsEnabled,
    tetWishesEnabled,
    setTetWishesEnabled,
    tetDensity,
    setTetDensity,
    wallpaper,
    setWallpaper,
    clearWallpaper,
    wallpaperDim,
    setWallpaperDim,
    wallpaperBlur,
    setWallpaperBlur,
    wallpaperPresets,
    themeOptions,
    accentOptions,
    lightToneOptions,
    darkToneOptions,
    glassToneOptions,
    uiRadiusOptions,
  } = useTheme();

  // Wallpaper upload/URL state
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState("");
  const [processingWallpaper, setProcessingWallpaper] = useState(false);
  const wallpaperFileRef = useRef(null);

  // Active view filter (all | appearance | profile | security)
  const [activeTab, setActiveTab] = useState("all");

  // Profile state
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || "👤");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const presetAvatars = [
    "👤", "👨‍💻", "👩‍💻", "🚀", "🐱", "🐶", "🦊", "🦁", "🐼", "⭐", "🏆", "🎯", "🔥", "✨",
  ];

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const closeDeleteModal = () => {
    if (deletingAccount) return;
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteError("");
  };

  useEffect(() => {
    if (!showDeleteModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !deletingAccount) {
        setShowDeleteModal(false);
        setDeletePassword("");
        setDeleteError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDeleteModal, deletingAccount]);

  // Preferences
  const [notifyDeadline, setNotifyDeadline] = useState(
    () => localStorage.getItem("pref_notify") !== "false"
  );
  const [autoComplete100, setAutoComplete100] = useState(
    () => localStorage.getItem("pref_auto_complete") !== "false"
  );

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setSelectedAvatar(currentUser.avatar || "👤");
    }
  }, [currentUser]);

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Họ tên không được để trống!", "error");
      return;
    }
    if (!email.trim()) {
      showToast("Email không được để trống!", "error");
      return;
    }

    setSavingProfile(true);
    await onUpdateProfile(name.trim(), email.trim());
    setSavingProfile(false);
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("Vui lòng nhập mật khẩu hiện tại!", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("Xác nhận mật khẩu mới không khớp!", "error");
      return;
    }

    setChangingPassword(true);
    const success = await onChangePassword(
      currentPassword,
      newPassword,
      confirmNewPassword
    );
    setChangingPassword(false);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  // Update Avatar Handler
  const handleSelectAvatar = async (avatar) => {
    setSelectedAvatar(avatar);
    await onUpdateAvatar(avatar);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Dung lượng ảnh tối đa là 2MB!", "error");
      return;
    }

    const reader = new FileReader();
    setUploadingAvatar(true);
    reader.onload = async (event) => {
      try {
        const base64 = event.target.result;
        setSelectedAvatar(base64);
        await onUpdateAvatar(base64);
      } catch {
        showToast("Không thể tải ảnh đại diện!", "error");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = async (e) => {
    e.preventDefault();
    if (!customAvatarUrl.trim()) return;
    try {
      setUploadingAvatar(true);
      setSelectedAvatar(customAvatarUrl.trim());
      await onUpdateAvatar(customAvatarUrl.trim());
      setCustomAvatarUrl("");
    } catch {
      showToast("Không thể cập nhật ảnh đại diện!", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResetAvatar = async () => {
    setSelectedAvatar("👤");
    await onUpdateAvatar(null);
  };

  // Compress uploaded wallpaper image to safe Full-HD size for localStorage
  const compressWallpaperFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh"));
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onerror = () => reject(new Error("Định dạng ảnh không hợp lệ"));
        img.onload = () => {
          const maxW = 1920;
          const maxH = 1080;
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressed);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleWallpaperFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Dung lượng ảnh gốc tối đa là 10MB!", "error");
      return;
    }

    try {
      setProcessingWallpaper(true);
      const compressedDataUrl = await compressWallpaperFile(file);
      const saved = setWallpaper(compressedDataUrl);
      if (saved) {
        showToast("Đã cập nhật ảnh nền cho toàn bộ trang!", "success");
      } else {
        showToast("Ảnh quá lớn so với bộ nhớ trình duyệt, hãy thử ảnh nhẹ hơn.", "error");
      }
    } catch (err) {
      showToast(err.message || "Không thể xử lý ảnh nền!", "error");
    } finally {
      setProcessingWallpaper(false);
    }
  };

  const handleApplyWallpaperUrl = (e) => {
    e.preventDefault();
    const trimmed = wallpaperUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      showToast("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://", "error");
      return;
    }
    const saved = setWallpaper(trimmed);
    if (saved) {
      setWallpaperUrlInput("");
      showToast("Đã áp dụng ảnh nền từ liên kết!", "success");
    } else {
      showToast("Không thể lưu liên kết ảnh nền.", "error");
    }
  };

  // Save Preferences
  const handleSavePreferences = () => {
    localStorage.setItem("pref_notify", String(notifyDeadline));
    localStorage.setItem("pref_auto_complete", String(autoComplete100));
    showToast("Đã lưu các tùy chọn hệ thống thành công!", "success");
  };

  // Delete Account Handler
  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) {
      const msg = "Vui lòng nhập mật khẩu xác nhận xóa tài khoản!";
      setDeleteError(msg);
      showToast(msg, "error");
      return;
    }

    setDeletingAccount(true);
    const result = await onDeleteAccount(deletePassword);
    setDeletingAccount(false);
    if (result?.ok) {
      setShowDeleteModal(false);
      setDeletePassword("");
      setDeleteError("");
    } else if (result?.message) {
      setDeleteError(result.message);
    }
  };

  const renderThemeIcon = (id) => {
    if (id === "tet") return <Sparkles size={15} strokeWidth={1.75} />;
    if (id === "glass") return <Droplets size={15} strokeWidth={1.75} />;
    if (id === "light") return <Sun size={15} strokeWidth={1.75} />;
    return <Moon size={15} strokeWidth={1.75} />;
  };

  const currentThemeObj = themeOptions.find((t) => t.id === theme) || themeOptions[0];
  const currentAccentObj = accentOptions.find((a) => a.id === accent) || accentOptions[0];

  const showAppearance = activeTab === "all" || activeTab === "appearance";
  const showProfile = activeTab === "all" || activeTab === "profile";
  const showSecurity = activeTab === "all" || activeTab === "security";

  return (
    <section className="settings-page page-enter">
      {/* TOP FULL-WIDTH ACCOUNT TELEMETRY HEADER */}
      <div className="settings-console-bar">
        <div className="settings-identity-strip">
          <UserAvatar avatar={selectedAvatar} name={name} size={48} />
          <div className="settings-identity-copy">
            <div className="settings-title-line">
              <h1>Hồ sơ &amp; Cài đặt hệ thống</h1>
              <span className="tech-tag">JWT AUTH</span>
            </div>
            <p>
              {name || "Người dùng"} <span className="sep">/</span> {email || "Chưa cập nhật email"}
            </p>
          </div>
        </div>

        <div className="settings-telemetry-chips">
          <div className="telemetry-kv">
            <span className="kv-key">THEME</span>
            <strong className="kv-val">{currentThemeObj?.label}</strong>
          </div>
          <div className="telemetry-kv">
            <span className="kv-key">ACCENT</span>
            <strong className="kv-val">
              <i
                className="kv-dot"
                style={{ background: theme === "tet" ? "#F97316" : currentAccentObj?.color }}
              />
              {theme === "tet" ? "Cam Tết" : currentAccentObj?.label}
            </strong>
          </div>
          <div className="telemetry-kv">
            <span className="kv-key">ẢNH NỀN</span>
            <strong className="kv-val">{wallpaper ? "Đang bật" : "Mặc định"}</strong>
          </div>
          <div className="telemetry-kv">
            <span className="kv-key">NHẮC HẠN</span>
            <strong className="kv-val">{notifyDeadline ? "Đang bật" : "Đang tắt"}</strong>
          </div>
        </div>
      </div>

      {/* COMPACT SEGMENTED NAVIGATION TABS */}
      <div className="settings-nav-strip" role="tablist" aria-label="Phân mục cài đặt">
        {[
          { id: "all", label: "Tổng quan tất cả", icon: <Terminal size={14} strokeWidth={1.8} /> },
          { id: "appearance", label: "Giao diện & Chủ đề", icon: <Palette size={14} strokeWidth={1.8} /> },
          { id: "profile", label: "Thông tin cá nhân", icon: <User size={14} strokeWidth={1.8} /> },
          { id: "security", label: "Bảo mật & Hệ thống", icon: <ShieldCheck size={14} strokeWidth={1.8} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`settings-nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* FULL-WIDTH 2-COLUMN ENGINEERING WORKBENCH */}
      <div className={`settings-workbench ${activeTab !== "all" ? "is-single" : ""}`}>
        {/* LEFT COLUMN: APPEARANCE + PROFILE */}
        {(showAppearance || showProfile) && (
          <div className="settings-col">
            {/* PANEL 1: THEME, ACCENT COLORS & TET 2027 */}
            {showAppearance && (
              <section className="tech-panel">
                <div className="tech-panel-head">
                  <div className="tech-panel-title">
                    <Palette size={15} strokeWidth={1.85} />
                    <h2>Giao diện &amp; Chủ đề</h2>
                  </div>
                  <span className="tech-module-code">UI.THEME</span>
                </div>

                <div className="tech-panel-body">
                  {/* 3 THEME CARDS */}
                  <div className="settings-block">
                    <div className="settings-block-label">Chế độ hiển thị</div>
                    <div className="theme-cards-grid">
                      {themeOptions.map((opt) => {
                        const active = theme === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`theme-choice-card ${active ? "active" : ""} ${
                              opt.id === "tet" ? "theme-choice-tet" : ""
                            }`}
                            onClick={() => setTheme(opt.id)}
                          >
                            <div
                              className="theme-choice-preview"
                              style={{
                                background: opt.previewBg,
                                borderColor: opt.previewBorder,
                              }}
                            >
                              <div
                                className="theme-choice-preview-bar"
                                style={{
                                  background: opt.previewCard,
                                  borderColor: opt.previewBorder,
                                }}
                              />
                              <div
                                className="theme-choice-preview-accent"
                                style={{
                                  background:
                                    opt.id === "tet"
                                      ? "#F97316"
                                      : currentAccentObj?.color || "#2563EB",
                                }}
                              />
                            </div>

                            <div className="theme-choice-meta">
                              <div className="theme-choice-name">
                                {renderThemeIcon(opt.id)}
                                <span>{opt.label}</span>
                                {active && (
                                  <span className="theme-choice-check">
                                    <Check size={11} strokeWidth={2.6} />
                                  </span>
                                )}
                              </div>
                              <p className="theme-choice-desc">{opt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="settings-divider" />

                  {/* 5 ACCENT COLOR CHIPS */}
                  <div className="settings-block">
                    <div className="settings-block-label">
                      Màu nhấn chủ đạo (Sáng, Tối &amp; Kính lỏng)
                    </div>
                    <p className="settings-hint">
                      Đồng bộ cho nút thao tác chính, mục menu đang chọn, thanh tiến độ và viền ô nhập liệu.
                    </p>

                    <div className="settings-accent-row">
                      {accentOptions.map((opt) => {
                        const selected = accent === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`settings-accent-chip ${selected ? "selected" : ""}`}
                            onClick={() => {
                              setAccent(opt.id);
                              if (theme === "tet") {
                                setTheme("dark");
                                showToast(
                                  `Đã chuyển sang chế độ Tối với màu nhấn ${opt.label}`,
                                  "info"
                                );
                              }
                            }}
                          >
                            <span
                              className="settings-accent-circle"
                              style={{ backgroundColor: opt.color }}
                            >
                              {selected && <Check size={12} strokeWidth={2.6} color="#FFFFFF" />}
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="settings-divider" />

                  {/* GLOBAL BORDER RADIUS STYLE (ALL THEMES) */}
                  <div className="settings-block">
                    <div className="settings-block-label">Độ bo góc thẻ &amp; khung (áp dụng mọi chủ đề)</div>
                    <div className="theme-option-pills">
                      {uiRadiusOptions.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`theme-pill-btn ${uiRadius === r.id ? "active" : ""}`}
                          onClick={() => setUiRadius(r.id)}
                        >
                          <span>{r.label}</span>
                          <code>{r.value}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-divider" />

                  {/* THEME-SPECIFIC CUSTOMIZATION BLOCK (DYNAMIC FOR ALL 4 THEMES) */}
                  <div className="theme-custom-box">
                    <div className="theme-custom-box-head">
                      <strong>Tùy chỉnh riêng cho chủ đề {currentThemeObj?.label}</strong>
                      <span className="tech-module-code">{theme.toUpperCase()}.CONFIG</span>
                    </div>

                    {theme === "light" && (
                      <div className="settings-block">
                        <div className="settings-block-label">Sắc độ nền giấy sáng</div>
                        <div className="theme-option-pills">
                          {lightToneOptions.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`theme-pill-btn ${lightTone === t.id ? "active" : ""}`}
                              onClick={() => setLightTone(t.id)}
                            >
                              <i className="pill-swatch" style={{ background: t.swatch }} />
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {theme === "dark" && (
                      <div className="settings-block">
                        <div className="settings-block-label">Độ sâu nền tối</div>
                        <div className="theme-option-pills">
                          {darkToneOptions.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`theme-pill-btn ${darkTone === t.id ? "active" : ""}`}
                              onClick={() => setDarkTone(t.id)}
                            >
                              <i className="pill-swatch" style={{ background: t.swatch }} />
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {theme === "glass" && (
                      <div className="settings-block" style={{ gap: 14 }}>
                        <div>
                          <div className="settings-block-label" style={{ marginBottom: 8 }}>
                            Tông màu sóng nền Kính lỏng
                          </div>
                          <div className="theme-option-pills">
                            {glassToneOptions.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className={`theme-pill-btn ${glassTone === t.id ? "active" : ""}`}
                                onClick={() => setGlassTone(t.id)}
                              >
                                <i className="pill-swatch" style={{ background: t.swatch }} />
                                <span>{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="settings-block-label" style={{ marginBottom: 8 }}>
                            Mức độ trong suốt nhanh
                          </div>
                          <div className="theme-option-pills">
                            {[
                              { id: "ultra", label: "Siêu trong suốt", opacity: 8, blur: 12 },
                              { id: "crystal", label: "Pha lê chuẩn", opacity: 14, blur: 16 },
                              { id: "frosted", label: "Kính mờ dịu", opacity: 28, blur: 24 },
                            ].map((preset) => {
                              const isActive =
                                glassOpacity === preset.opacity && glassBlur === preset.blur;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  className={`theme-pill-btn ${isActive ? "active" : ""}`}
                                  onClick={() => {
                                    setGlassOpacity(preset.opacity);
                                    setGlassBlur(preset.blur);
                                  }}
                                >
                                  <span>{preset.label}</span>
                                  <code>{preset.opacity}%</code>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="wallpaper-sliders-grid">
                          <label className="wallpaper-slider-item">
                            <div className="wallpaper-slider-head">
                              <span>Độ mờ khúc xạ kính (Blur)</span>
                              <strong>{glassBlur}px</strong>
                            </div>
                            <input
                              type="range"
                              min={4}
                              max={34}
                              step={2}
                              value={glassBlur}
                              onChange={(e) => setGlassBlur(Number(e.target.value))}
                            />
                          </label>

                          <label className="wallpaper-slider-item">
                            <div className="wallpaper-slider-head">
                              <span>Độ đục bề mặt kính (thấp = càng trong)</span>
                              <strong>{glassOpacity}%</strong>
                            </div>
                            <input
                              type="range"
                              min={4}
                              max={50}
                              step={2}
                              value={glassOpacity}
                              onChange={(e) => setGlassOpacity(Number(e.target.value))}
                            />
                          </label>
                        </div>

                        <div className="setting-item-row">
                          <div className="setting-item-left">
                            <div className="setting-icon-box">
                              <Droplets size={16} strokeWidth={1.75} />
                            </div>
                            <div>
                              <h3>Hiệu ứng sóng lỏng chuyển động nền</h3>
                              <p>Chuyển động quang học mềm mại phía sau tất cả các trang</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`toggle ${glassMotion ? "active" : ""}`}
                            onClick={() => setGlassMotion(!glassMotion)}
                            aria-label="Bật tắt hiệu ứng sóng lỏng"
                          >
                            <span />
                          </button>
                        </div>
                      </div>
                    )}

                    {theme === "tet" && (
                      <div className="settings-block" style={{ gap: 14 }}>
                        <div className="setting-item-row">
                          <div className="setting-item-left">
                            <div className="setting-icon-box">
                              <Sparkles size={16} strokeWidth={1.75} />
                            </div>
                            <div>
                              <h3>Bao lì xì rơi phía sau nền</h3>
                              <p>Hiệu ứng bao lì xì cam-đỏ rơi dịu ở lớp nền sau, không che chức năng</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`toggle ${tetEffectsEnabled ? "active" : ""}`}
                            onClick={() => setTetEffectsEnabled(!tetEffectsEnabled)}
                            aria-label="Bật tắt bao lì xì rơi"
                          >
                            <span />
                          </button>
                        </div>

                        <div className="setting-item-row">
                          <div className="setting-item-left">
                            <div className="setting-icon-box">
                              <Sparkles size={16} strokeWidth={1.75} />
                            </div>
                            <div>
                              <h3>Câu chúc Tết rơi phía sau nền</h3>
                              <p>Hiển thị các lời chúc đầu xuân rơi nhẹ phía sau các thẻ nội dung</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`toggle ${tetWishesEnabled ? "active" : ""}`}
                            onClick={() => setTetWishesEnabled(!tetWishesEnabled)}
                            aria-label="Bật tắt câu chúc Tết rơi"
                          >
                            <span />
                          </button>
                        </div>

                        <div>
                          <div className="settings-block-label" style={{ marginBottom: 8 }}>
                            Mật độ hiệu ứng rơi
                          </div>
                          <div className="theme-option-pills">
                            {[
                              { id: "light", label: "Nhẹ nhàng" },
                              { id: "medium", label: "Vừa phải" },
                              { id: "festive", label: "Rộn ràng" },
                            ].map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                className={`theme-pill-btn ${tetDensity === d.id ? "active" : ""}`}
                                onClick={() => setTetDensity(d.id)}
                              >
                                <span>{d.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* PANEL 1B: CUSTOM GLOBAL WALLPAPER */}
            {showAppearance && (
              <section className="tech-panel">
                <div className="tech-panel-head">
                  <div className="tech-panel-title">
                    <ImageIcon size={15} strokeWidth={1.85} />
                    <h2>Ảnh nền cho tất cả các trang</h2>
                  </div>
                  <span className="tech-module-code">UI.WALLPAPER</span>
                </div>

                <div className="tech-panel-body">
                  {/* LIVE PREVIEW + UPLOAD / CLEAR ACTIONS */}
                  <div className="wallpaper-preview-row">
                    <div className="wallpaper-live-box">
                      {wallpaper ? (
                        <>
                          <div
                            className="wallpaper-live-img"
                            style={{
                              backgroundImage: `url("${wallpaper.replace(/"/g, '\\"')}")`,
                              filter: wallpaperBlur > 0 ? `blur(${Math.round(wallpaperBlur / 2)}px)` : "none",
                            }}
                          />
                          <div
                            className="wallpaper-live-scrim"
                            style={{ opacity: Math.min(0.85, wallpaperDim / 100) }}
                          />
                          <span className="wallpaper-live-badge">Đang áp dụng</span>
                        </>
                      ) : (
                        <div className="wallpaper-empty-preview">
                          <ImageIcon size={20} strokeWidth={1.6} />
                          <span>Nền mặc định theo chủ đề</span>
                        </div>
                      )}
                    </div>

                    <div className="wallpaper-upload-col">
                      <div className="settings-avatar-buttons">
                        <input
                          type="file"
                          ref={wallpaperFileRef}
                          onChange={handleWallpaperFileUpload}
                          accept="image/*"
                          style={{ display: "none" }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => wallpaperFileRef.current?.click()}
                          disabled={processingWallpaper}
                        >
                          <Upload size={14} strokeWidth={1.85} />
                          {processingWallpaper ? "Đang tối ưu ảnh..." : "Chọn ảnh từ máy tính"}
                        </button>

                        {wallpaper && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              clearWallpaper();
                              showToast("Đã gỡ ảnh nền, quay về nền mặc định.", "info");
                            }}
                          >
                            <X size={14} strokeWidth={1.85} />
                            Gỡ ảnh nền
                          </button>
                        )}
                      </div>

                      <p className="settings-hint">
                        Áp dụng đồng bộ làm nền phủ kính mờ cho toàn bộ trang (Không gian làm việc, Kanban, Bảng điều khiển, Lịch, Thống kê, Trợ lý...). Ảnh tải lên tự động tối ưu dung lượng.
                      </p>

                      <form onSubmit={handleApplyWallpaperUrl} className="settings-url-form">
                        <input
                          type="url"
                          className="form-input"
                          placeholder="Hoặc dán đường dẫn ảnh nền (https://...)"
                          value={wallpaperUrlInput}
                          onChange={(e) => setWallpaperUrlInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="btn btn-secondary btn-sm"
                          disabled={!wallpaperUrlInput.trim()}
                        >
                          Áp dụng
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  {/* CURATED PRESETS */}
                  <div className="settings-block">
                    <div className="settings-block-label">Thư viện ảnh nền có sẵn</div>
                    <div className="wallpaper-presets-grid">
                      <button
                        type="button"
                        className={`wallpaper-preset-tile is-none ${!wallpaper ? "active" : ""}`}
                        onClick={() => {
                          clearWallpaper();
                          showToast("Đã chuyển về nền mặc định.", "info");
                        }}
                      >
                        <div className="wallpaper-preset-thumb none-thumb">
                          <span>Mặc định</span>
                        </div>
                        <span className="wallpaper-preset-name">Không dùng ảnh</span>
                      </button>

                      {wallpaperPresets.map((preset) => {
                        const isSelected = wallpaper === preset.value;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`wallpaper-preset-tile ${isSelected ? "active" : ""}`}
                            onClick={() => {
                              setWallpaper(preset.value);
                              showToast(`Đã đổi nền sang "${preset.label}"`, "success");
                            }}
                          >
                            <div
                              className="wallpaper-preset-thumb"
                              style={{ backgroundImage: `url("${preset.value}")` }}
                            >
                              {isSelected && (
                                <span className="wallpaper-preset-check">
                                  <Check size={11} strokeWidth={2.8} />
                                </span>
                              )}
                            </div>
                            <span className="wallpaper-preset-name">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DIM & BLUR SLIDERS */}
                  {wallpaper && (
                    <>
                      <div className="settings-divider" />
                      <div className="wallpaper-sliders-grid">
                        <label className="wallpaper-slider-item">
                          <div className="wallpaper-slider-head">
                            <span>Độ phủ làm dịu nền (giúp dễ đọc chữ)</span>
                            <strong>{wallpaperDim}%</strong>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={85}
                            step={5}
                            value={wallpaperDim}
                            onChange={(e) => setWallpaperDim(Number(e.target.value))}
                          />
                        </label>

                        <label className="wallpaper-slider-item">
                          <div className="wallpaper-slider-head">
                            <span>Độ mờ ảnh nền (Blur)</span>
                            <strong>{wallpaperBlur}px</strong>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={16}
                            step={1}
                            value={wallpaperBlur}
                            onChange={(e) => setWallpaperBlur(Number(e.target.value))}
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* PANEL 2: PROFILE MANAGEMENT */}
            {showProfile && (
              <section className="tech-panel">
                <div className="tech-panel-head">
                  <div className="tech-panel-title">
                    <User size={15} strokeWidth={1.85} />
                    <h2>Thông tin cá nhân &amp; Ảnh đại diện</h2>
                  </div>
                  <span className="tech-module-code">USER.PROFILE</span>
                </div>

                <div className="tech-panel-body">
                  <div className="settings-block">
                    <div className="settings-avatar-header">
                      <UserAvatar avatar={selectedAvatar} name={name} size={58} />
                      <div className="settings-avatar-controls">
                        <div className="settings-avatar-buttons">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            style={{ display: "none" }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                          >
                            <Upload size={14} strokeWidth={1.75} />
                            Tải ảnh từ máy tính
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleResetAvatar}
                            disabled={uploadingAvatar}
                          >
                            <RotateCcw size={14} strokeWidth={1.75} />
                            Đặt lại mặc định
                          </button>
                        </div>
                        <p className="settings-hint">
                          Hỗ trợ PNG, JPG, WebP tối đa 2MB, dán liên kết ảnh hoặc chọn biểu tượng nhanh.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleApplyUrl} className="settings-url-form">
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Hoặc dán liên kết ảnh (https://...)"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={!customAvatarUrl.trim() || uploadingAvatar}
                      >
                        Áp dụng
                      </button>
                    </form>

                    <div className="settings-preset-grid">
                      {presetAvatars.map((av) => (
                        <button
                          key={av}
                          type="button"
                          className={`settings-preset-btn ${
                            selectedAvatar === av ? "selected" : ""
                          }`}
                          onClick={() => handleSelectAvatar(av)}
                          title={`Chọn biểu tượng ${av}`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <form onSubmit={handleSaveProfile} className="settings-form-stack">
                    <div className="settings-grid-2">
                      <div className="form-group">
                        <label className="form-label">Họ và tên</label>
                        <input
                          type="text"
                          className="form-input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Địa chỉ Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="tech-panel-action-row">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingProfile}
                      >
                        <Save size={15} strokeWidth={1.75} />
                        {savingProfile ? "Đang lưu..." : "Lưu thông tin cá nhân"}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: SECURITY + SYSTEM PREFERENCES + DANGER ZONE */}
        {showSecurity && (
          <div className="settings-col">
            {/* PANEL 3: CHANGE PASSWORD */}
            <section className="tech-panel">
              <div className="tech-panel-head">
                <div className="tech-panel-title">
                  <Lock size={15} strokeWidth={1.85} />
                  <h2>Bảo mật &amp; Đổi mật khẩu</h2>
                </div>
                <span className="tech-module-code">AUTH.PASS</span>
              </div>

              <div className="tech-panel-body">
                <form onSubmit={handleChangePassword} className="settings-form-stack">
                  <div className="form-group">
                    <label className="form-label">Mật khẩu hiện tại *</label>
                    <input
                      type="password"
                      className="form-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu cũ..."
                      required
                    />
                  </div>

                  <div className="settings-grid-2">
                    <div className="form-group">
                      <label className="form-label">Mật khẩu mới (≥ 6 ký tự) *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Xác nhận mật khẩu mới *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        required
                      />
                    </div>
                  </div>

                  <div className="tech-panel-action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={changingPassword}
                    >
                      <Lock size={14} strokeWidth={1.85} />
                      {changingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const res = await fetch(API_ENDPOINTS.logoutAll, {
                            method: "POST",
                            headers: getAuthHeaders(),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast?.(data.message || "Đã đăng xuất khỏi mọi thiết bị!", "success");
                            setTimeout(() => _onLogout?.(), 700);
                          } else {
                            showToast?.(data.message || "Không thể thu hồi phiên.", "error");
                          }
                        } catch {
                          showToast?.("Lỗi kết nối máy chủ.", "error");
                        }
                      }}
                    >
                      <ShieldCheck size={14} strokeWidth={1.85} />
                      Đăng xuất mọi thiết bị
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* PANEL 4: SYSTEM PREFERENCES */}
            <section className="tech-panel">
              <div className="tech-panel-head">
                <div className="tech-panel-title">
                  <Sliders size={15} strokeWidth={1.85} />
                  <h2>Tùy chọn tự động hóa</h2>
                </div>
                <span className="tech-module-code">SYS.PREFS</span>
              </div>

              <div className="tech-panel-body">
                <div className="setting-item-row">
                  <div className="setting-item-left">
                    <div className="setting-icon-box">
                      <Bell size={16} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3>Nhắc việc khi gần đến deadline</h3>
                      <p>Tự động hiển thị cảnh báo cho công việc có hạn trong vòng 48 giờ</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`toggle ${notifyDeadline ? "active" : ""}`}
                    onClick={() => setNotifyDeadline(!notifyDeadline)}
                  >
                    <span />
                  </button>
                </div>

                <div className="settings-divider" />

                <div className="setting-item-row">
                  <div className="setting-item-left">
                    <div className="setting-icon-box">
                      <CheckCircle2 size={16} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3>Tự động hoàn thành khi đạt 100%</h3>
                      <p>
                        Chuyển trạng thái sang Hoàn thành ngay khi toàn bộ bước con được đánh dấu
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`toggle ${autoComplete100 ? "active" : ""}`}
                    onClick={() => setAutoComplete100(!autoComplete100)}
                  >
                    <span />
                  </button>
                </div>

                <div className="tech-panel-action-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSavePreferences}
                  >
                    <Save size={14} strokeWidth={1.75} />
                    Lưu tùy chọn hệ thống
                  </button>
                </div>
              </div>
            </section>

            {/* PANEL 5: DANGER ZONE */}
            <section className="tech-panel is-danger-panel">
              <div className="tech-panel-head">
                <div className="tech-panel-title danger-heading">
                  <AlertTriangle size={15} strokeWidth={1.85} />
                  <h2>Vùng nguy hiểm</h2>
                </div>
                <span className="tech-module-code is-danger">SYS.DELETE</span>
              </div>

              <div className="tech-panel-body">
                <div className="settings-danger-inner">
                  <div>
                    <h3>Xóa tài khoản vĩnh viễn</h3>
                    <p>
                      Toàn bộ dữ liệu công việc, danh mục và thông báo của bạn sẽ bị xóa hoàn toàn khỏi SQL Server và không thể khôi phục.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                    Xóa tài khoản
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* DELETE ACCOUNT CONFIRMATION MODAL (Portal directly onto body so it always centers in viewport) */}
      {showDeleteModal &&
        createPortal(
          <div className="team-modal-backdrop" onClick={closeDeleteModal}>
            <div
              className="team-modal"
              style={{ maxWidth: 440 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-modal-title"
            >
              <div className="team-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
                  <AlertTriangle size={18} strokeWidth={1.75} />
                  <h2 id="delete-account-modal-title" style={{ color: "var(--danger)" }}>
                    Xác nhận xóa tài khoản
                  </h2>
                </div>
                <button
                  type="button"
                  className="team-modal-close"
                  onClick={closeDeleteModal}
                  aria-label="Đóng hộp thoại"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleDeleteAccountSubmit}>
                <div className="team-modal-body">
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.55 }}>
                    Hành động này sẽ xóa vĩnh viễn toàn bộ không gian làm việc do bạn sở hữu, công việc, danh mục và thông báo của tài khoản{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{currentUser?.email}</strong>. Vui lòng nhập mật khẩu để xác nhận:
                  </p>

                  {deleteError && (
                    <div
                      style={{
                        background: "var(--danger-light)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "var(--danger)",
                        borderRadius: 8,
                        padding: "9px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 14,
                      }}
                    >
                      {deleteError}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="delete-account-password">
                      Mật khẩu của bạn *
                    </label>
                    <input
                      id="delete-account-password"
                      type="password"
                      className="form-input"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        if (deleteError) setDeleteError("");
                      }}
                      placeholder="Nhập mật khẩu để xác nhận..."
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="team-modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeDeleteModal}
                    disabled={deletingAccount}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? "Đang xóa..." : "Xác nhận xóa vĩnh viễn"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

export default Settings;
