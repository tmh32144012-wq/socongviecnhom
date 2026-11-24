import { useEffect, useState } from "react";
import "./Login.css";
import { API_ENDPOINTS } from "./config/api";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

function Login({ onLogin, onRegister, onBackToIntro }) {
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
    } catch (err) {
      setError("Không thể kết nối đến máy chủ. Hãy đảm bảo server đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="14" rx="1.2" />
              <rect x="9.5" y="3" width="5" height="9" rx="1.2" />
              <rect x="16" y="3" width="5" height="18" rx="1.2" />
            </svg>
          </div>
          <span className="auth-brand-name">Sổ Việc Nhóm</span>
        </div>

        <div className="auth-showcase-body">
          <span className="auth-kicker">Không gian Kanban cho đội nhóm</span>
          <h1>Tổ chức công việc rõ ràng, đồng bộ cùng cả nhóm theo thời gian thực.</h1>
          <p>
            Tạo bảng dự án, tùy biến cột trạng thái, kéo thả thẻ trực quan, phân công nhiều thành viên và trao đổi trực tiếp trên từng đầu việc.
          </p>

          <div className="auth-board-preview" aria-hidden="true">
            <div className="auth-preview-col">
              <div className="auth-preview-col-title">
                <span>To Do</span>
                <span>2</span>
              </div>
              <div className="auth-preview-card">
                Đặc tả API & hướng dẫn cài đặt
                <div className="auth-preview-meta">
                  <span>Hạn: 26/11</span>
                  <div className="auth-preview-dots">
                    <span style={{ background: "#0f766e" }}>NL</span>
                    <span style={{ background: "#b45309" }}>ĐK</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="auth-preview-col">
              <div className="auth-preview-col-title">
                <span>Doing</span>
                <span>1</span>
              </div>
              <div className="auth-preview-card">
                Kéo thả thẻ Kanban & Realtime
                <div className="auth-preview-meta">
                  <span>67%</span>
                  <div className="auth-preview-dots">
                    <span style={{ background: "#1d4ed8" }}>MH</span>
                    <span style={{ background: "#0f766e" }}>NL</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="auth-preview-col">
              <div className="auth-preview-col-title">
                <span>Done</span>
                <span>1</span>
              </div>
              <div className="auth-preview-card">
                Thiết kế SQL Server & JWT
                <div className="auth-preview-meta">
                  <span>100%</span>
                  <div className="auth-preview-dots">
                    <span style={{ background: "#15803d" }}>MH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-showcase-footer">
          <span>Node.js & React</span>
          <span>SQL Server</span>
          <span>Cập nhật trực tiếp Socket.io</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          {onBackToIntro && (
            <button
              type="button"
              className="auth-back-intro-btn"
              onClick={onBackToIntro}
            >
              ← Xem lại trang giới thiệu
            </button>
          )}
          <div className="auth-card-header">
            <h2>Đăng nhập tài khoản</h2>
            <p>Tiếp tục theo dõi bảng công việc và tiến độ cùng nhóm của bạn.</p>
          </div>

          {error && <div className="auth-error-box">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
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
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-captcha">Mã xác nhận</label>
              <div className="auth-captcha-row">
                <div
                  className="auth-captcha-svg"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
                <button
                  type="button"
                  className="auth-captcha-refresh"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  title="Tải mã mới"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Đổi mã
                </button>
              </div>
              <input
                id="login-captcha"
                type="text"
                placeholder="Nhập 6 ký tự trong hình"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                autoComplete="off"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </button>
          </form>

          <div className="auth-switch-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => setForgotOpen(true)}
            >
              Quên mật khẩu? Khôi phục bằng OTP
            </button>
          </div>

          <div className="auth-switch-row" style={{ marginTop: 10 }}>
            Chưa có tài khoản?
            <button type="button" className="auth-switch-link" onClick={onRegister}>
              Đăng ký ngay
            </button>
          </div>
        </div>
      </section>

      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}

export default Login;
