import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Droplets,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  UserPlus,
  Zap,
} from "lucide-react";
import "./Login.css";
import { API_ENDPOINTS } from "./config/api";
import { useTheme } from "./context/ThemeContext";
import ForgotPasswordModal from "./components/ForgotPasswordModal";
import BrandLogo from "./components/BrandLogo";
import SocialAuthButtons from "./components/SocialAuthButtons";

function Login({ onLogin, onRegister, onBackToIntro }) {
  const { theme, cycleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const res = await fetch(API_ENDPOINTS.captcha);
      if (res.ok) {
        const data = await res.json();
        setCaptchaToken(data.captchaToken);
        setCaptchaSvg(data.captchaSvg);
        setCaptchaInput("");
      }
    } catch (err) {
      console.error("Lỗi lấy mã CAPTCHA:", err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    if (!captchaInput.trim()) {
      setError("Vui lòng nhập mã xác nhận CAPTCHA.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaInput: captchaInput.trim(),
          captchaToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Đăng nhập không thành công.");
        fetchCaptcha();
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("currentUser", JSON.stringify(data.user));
      }

      onLogin(data.user);
    } catch {
      setError("Không thể kết nối đến máy chủ. Hãy đảm bảo server đang chạy.");
    } finally {
      setLoading(false);
    }
  };

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
              onClick={onRegister}
            >
              <UserPlus size={14} strokeWidth={2} />
              <span>Trang Đăng ký</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LOGIN STAGE */}
      <main className="auth-stage">
        <div className="auth-stage-grid">
          {/* LEFT WORKSPACE SIGNAL COLUMN */}
          <section className="auth-story-col">
            <div className="auth-badge-chip">
              <span className="auth-badge-dot" />
              <span>Cổng Đăng nhập • KanoFlow</span>
            </div>

            <h1>
              Tiếp tục nhịp công việc nhóm <span>mượt mà</span> mỗi ngày.
            </h1>

            <p className="auth-story-lead">
              Đăng nhập để mở lại các bảng Kanban của đội bạn, theo dõi hạn chót, trao đổi trực tiếp và xem ai vừa cập nhật công việc theo thời gian thực.
            </p>

            <div className="auth-kanban-showcase" aria-hidden="true">
              <div className="auth-ks-head">
                <span>KanoFlow • Không gian nhóm trực tuyến</span>
                <span className="auth-ks-live">
                  <i /> Socket.io Live
                </span>
              </div>

              <div className="auth-board-preview">
                <div className="auth-preview-col">
                  <div className="auth-preview-col-title">
                    <span>To Do</span>
                    <em>2</em>
                  </div>
                  <div className="auth-preview-card">
                    Đặc tả API &amp; hướng dẫn triển khai
                    <div className="auth-preview-meta">
                      <span>26/11</span>
                      <div className="auth-preview-dots">
                        <span style={{ background: "#0f766e" }}>NL</span>
                        <span style={{ background: "#ea580c" }}>ĐK</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="auth-preview-col">
                  <div className="auth-preview-col-title">
                    <span>Doing</span>
                    <em>1</em>
                  </div>
                  <div className="auth-preview-card">
                    Kéo thả Kanban &amp; đồng bộ Realtime
                    <div className="auth-preview-meta">
                      <span>75%</span>
                      <div className="auth-preview-dots">
                        <span style={{ background: "#2563eb" }}>MH</span>
                        <span style={{ background: "#0f766e" }}>NL</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="auth-preview-col">
                  <div className="auth-preview-col-title">
                    <span>Done</span>
                    <em>1</em>
                  </div>
                  <div className="auth-preview-card">
                    SQL Server &amp; xác thực JWT
                    <div className="auth-preview-meta">
                      <span>100%</span>
                      <div className="auth-preview-dots">
                        <span style={{ background: "#16a34a" }}>MH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-trust-row">
              <span className="auth-trust-pill"><ShieldCheck size={14} /> Bảo mật JWT &amp; CAPTCHA 1 lần</span>
              <span className="auth-trust-pill"><Zap size={14} /> Đồng bộ Socket.io tức thì</span>
            </div>
          </section>

          {/* RIGHT MODERN GLASS LOGIN CARD */}
          <section className="auth-card">
            <div className="auth-card-kicker">
              <ShieldCheck size={13} strokeWidth={2.2} />
              <span>XÁC THỰC TÀI KHOẢN</span>
            </div>

            <div className="auth-card-header">
              <h2>Đăng nhập KanoFlow</h2>
              <p>Nhập thông tin tài khoản để truy cập không gian làm việc của bạn.</p>
            </div>

            {error && <div className="auth-error-box">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label htmlFor="login-email">Địa chỉ Email</label>
                <div className="auth-input-shell">
                  <span className="auth-input-icon">
                    <Mail size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="tenban@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password">Mật khẩu</label>
                  <button
                    type="button"
                    className="auth-inline-forgot"
                    onClick={() => setForgotOpen(true)}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="auth-input-shell has-toggle">
                  <span className="auth-input-icon">
                    <Lock size={16} strokeWidth={1.85} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-captcha">Mã xác thực CAPTCHA</label>
                  <span
                    className={`auth-captcha-counter ${
                      captchaInput.trim().length === 6 ? "is-complete" : ""
                    }`}
                  >
                    {captchaInput.trim().length}/6 ký tự
                  </span>
                </div>
                <div className="auth-captcha-box">
                  <div className="auth-captcha-row">
                    <button
                      type="button"
                      className={`auth-captcha-svg ${captchaLoading ? "is-loading" : ""}`}
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      title="Nhấn vào mã để đổi mã xác thực mới"
                      aria-label="Đổi mã xác thực CAPTCHA mới"
                    >
                      {captchaSvg ? (
                        <span
                          className="auth-captcha-svg-inner"
                          dangerouslySetInnerHTML={{ __html: captchaSvg }}
                        />
                      ) : (
                        <span className="auth-captcha-placeholder">Đang tạo mã bảo mật...</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`auth-captcha-refresh ${captchaLoading ? "is-spinning" : ""}`}
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      title="Tải mã mới"
                      aria-label="Tải mã CAPTCHA mới"
                    >
                      <RefreshCw size={15} strokeWidth={2.2} />
                      <span>Đổi mã</span>
                    </button>
                  </div>
                  <div className="auth-input-shell auth-captcha-input-shell">
                    <span className="auth-input-icon">
                      <KeyRound size={15} strokeWidth={1.85} />
                    </span>
                    <input
                      id="login-captcha"
                      type="text"
                      maxLength={6}
                      placeholder="Nhập 6 ký tự trên ảnh"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <span>{loading ? "Đang xác thực..." : "Đăng nhập vào KanoFlow"}</span>
                {!loading && <ArrowRight size={16} strokeWidth={2.2} />}
              </button>
            </form>

            <SocialAuthButtons mode="login" />

            <div className="auth-switch-card">
              <span>Chưa có tài khoản?</span>
              <button type="button" className="auth-switch-link" onClick={onRegister}>
                <span>Chuyển sang trang Đăng ký</span>
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <ForgotPasswordModal
        isOpen={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
        onResetSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword("");
          setError("");
          fetchCaptcha();
        }}
      />
    </div>
  );
}

export default Login;
