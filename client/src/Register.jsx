import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  UserPlus,
} from "lucide-react";
import "./Login.css";
import { API_ENDPOINTS } from "./config/api";
import { useTheme } from "./context/ThemeContext";
import BrandLogo from "./components/BrandLogo";
import SocialAuthButtons from "./components/SocialAuthButtons";

function getPasswordStrength(pw) {
  if (!pw) return { label: "", color: "transparent", width: "0%" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { label: "Yếu", color: "#ef4444", width: "26%" };
  if (score === 2) return { label: "Trung bình", color: "#f59e0b", width: "56%" };
  if (score === 3) return { label: "Khá mạnh", color: "#10b981", width: "82%" };
  return { label: "Rất mạnh", color: "#22c55e", width: "100%" };
}

function Register({ onRegister, goToLogin, onBackToIntro }) {
  const { theme, cycleTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Họ tên không được để trống.");
      return;
    }
    if (!email.trim()) {
      setError("Email không được để trống.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Đăng ký thất bại.");
        return;
      }

      onRegister();
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = Boolean(confirmPassword) && confirmPassword === password;

  const renderThemeIcon = () => {
    if (theme === "light") return <Sun size={14} strokeWidth={1.9} />;
    if (theme === "glass") return <Droplets size={14} strokeWidth={1.9} />;
    if (theme === "tet") return <Sparkles size={14} strokeWidth={1.9} />;
    return <Moon size={14} strokeWidth={1.9} />;
  };

  const themeLabel =
    theme === "light" ? "Sáng" : theme === "glass" ? "Kính lỏng" : theme === "tet" ? "Tết" : "Tối";

  return (
    <div className="auth-shell">
      <div className="auth-ambient" aria-hidden="true">
        <div className="auth-ambient-grid" />
        <div className="auth-ambient-glow glow-1" />
        <div className="auth-ambient-glow glow-2" />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="auth-topbar">
        <div className="auth-topbar-inner">
          <div className="auth-topbar-left">
            <BrandLogo
              size="md"
              animated
              subtitle="Kanban Realtime"
              onClick={onBackToIntro}
            />
            {onBackToIntro && (
              <button type="button" className="auth-pill-btn" onClick={onBackToIntro}>
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Trang giới thiệu</span>
              </button>
            )}
          </div>

          <div className="auth-topbar-right">
            <button
              type="button"
              className="auth-pill-btn"
              onClick={cycleTheme}
              title="Đổi nhanh chủ đề giao diện"
            >
              {renderThemeIcon()}
              <span>{themeLabel}</span>
            </button>
            <button
              type="button"
              className="auth-pill-btn is-switch"
              onClick={goToLogin}
            >
              <LogIn size={14} strokeWidth={2} />
              <span>Trang Đăng nhập</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN REGISTER STAGE */}
      <main className="auth-stage">
        <div className="auth-stage-grid">
          {/* LEFT ONBOARDING BLUEPRINT COLUMN */}
          <section className="auth-story-col">
            <div className="auth-badge-chip">
              <span className="auth-badge-dot" />
              <span>Khởi tạo Tài khoản • KanoFlow</span>
            </div>

            <h1>
              Mở không gian <span>Kanban nhóm</span> chỉ trong 30 giây.
            </h1>

            <p className="auth-story-lead">
              Tạo tài khoản cá nhân để khởi tạo nhiều bảng dự án, phân quyền cho đồng đội và quản lý toàn bộ tiến độ công việc tại một nơi duy nhất.
            </p>

            <div className="auth-milestones">
              <div className="auth-milestone-card">
                <div className="auth-milestone-num">01</div>
                <div>
                  <strong>Tạo tài khoản bảo mật chuẩn JWT</strong>
                  <p>Mật khẩu mã hóa bcrypt an toàn, hỗ trợ khôi phục OTP 3 bước và đăng xuất tất cả thiết bị.</p>
                </div>
              </div>
              <div className="auth-milestone-card">
                <div className="auth-milestone-num">02</div>
                <div>
                  <strong>Tự động tạo sẵn bảng 3 cột To Do, Doing, Done</strong>
                  <p>Kéo thả thẻ mượt mà, thêm cột tùy biến, đính kèm tệp và theo dõi lịch sử sửa đổi theo thời gian thực.</p>
                </div>
              </div>
              <div className="auth-milestone-card">
                <div className="auth-milestone-num">03</div>
                <div>
                  <strong>Mời thành viên &amp; cộng tác tức thì</strong>
                  <p>Gán nhiều người làm, chat nhóm trực tiếp trên bảng và xem báo cáo đối chiếu công việc đã hoàn thành.</p>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT MODERN GLASS REGISTER CARD */}
          <section className="auth-card">
            <div className="auth-card-kicker">
              <UserPlus size={13} strokeWidth={2.2} />
              <span>ĐĂNG KÝ THÀNH VIÊN MỚI</span>
            </div>

            <div className="auth-card-header">
              <h2>Tạo tài khoản KanoFlow</h2>
              <p>Điền thông tin cơ bản bên dưới để bắt đầu không gian làm việc của bạn.</p>
            </div>

            {error && <div className="auth-error-box">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="reg-name">Họ và tên</label>
                <div className="auth-input-shell">
                  <span className="auth-input-icon">
                    <User size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-email">Địa chỉ Email</label>
                <div className="auth-input-shell">
                  <span className="auth-input-icon">
                    <Mail size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="tenban@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-password">Mật khẩu</label>
                <div className="auth-input-shell has-toggle">
                  <span className="auth-input-icon">
                    <Lock size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {password && (
                  <div className="auth-strength-wrap">
                    <div className="auth-strength-track">
                      <div
                        className="auth-strength-fill"
                        style={{ width: strength.width, backgroundColor: strength.color }}
                      />
                    </div>
                    <span className="auth-strength-label" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-confirm">Xác nhận mật khẩu</label>
                <div className="auth-input-shell has-toggle">
                  <span className="auth-input-icon">
                    <ShieldCheck size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {confirmPassword && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 5,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: passwordsMatch ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {passwordsMatch && <CheckCircle2 size={13} />}
                    <span>{passwordsMatch ? "Mật khẩu xác nhận đã khớp" : "Mật khẩu xác nhận chưa khớp"}</span>
                  </div>
                )}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <span>{loading ? "Đang khởi tạo tài khoản..." : "Tạo tài khoản KanoFlow"}</span>
                {!loading && <ArrowRight size={16} strokeWidth={2.2} />}
              </button>
            </form>

            <SocialAuthButtons mode="register" />

            <div className="auth-switch-card">
              <span>Đã có tài khoản?</span>
              <button type="button" className="auth-switch-link" onClick={goToLogin}>
                <span>Chuyển sang trang Đăng nhập</span>
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Register;
