import { useState } from "react";
import "./Login.css";
import { API_ENDPOINTS } from "./config/api";

function Register({ onRegister, goToLogin, onBackToIntro }) {
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
    } catch (err) {
      setError("Không thể kết nối đến máy chủ.");
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
          <span className="auth-kicker">Bắt đầu miễn phí trong vài giây</span>
          <h1>Tạo tài khoản và mời đồng đội vào bảng công việc chung.</h1>
          <p>
            Mỗi thành viên sau khi đăng ký có thể tạo không gian làm việc riêng, tham gia nhiều dự án cùng lúc và nhận thông báo ngay khi được giao việc hoặc có bình luận mới.
          </p>
        </div>

        <div className="auth-showcase-footer">
          <span>Xác thực bảo mật JWT</span>
          <span>Phân quyền rõ ràng</span>
          <span>Lưu trữ SQL Server</span>
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
            <h2>Tạo tài khoản mới</h2>
            <p>Điền thông tin cơ bản để tham gia không gian làm việc nhóm.</p>
          </div>

          {error && <div className="auth-error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-name">Họ và tên</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <label htmlFor="reg-confirm">Nhập lại mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                >
                  {showConfirmPassword ? (
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

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>

          <div className="auth-switch-row">
            Đã có tài khoản?
            <button type="button" className="auth-switch-link" onClick={goToLogin}>
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Register;
