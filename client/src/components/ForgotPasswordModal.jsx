import { useState } from "react";
import { API_ENDPOINTS } from "../config/api";

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Nhập email, 2: Nhập OTP & mật khẩu mới
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.forgotPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Không thể gửi mã OTP.");
        return;
      }
      setMessage(data.message);
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setStep(2);
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.resetPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Đặt lại mật khẩu thất bại.");
        return;
      }
      setMessage(data.message);
      setTimeout(() => {
        setStep(1);
        setOtp("");
        setNewPassword("");
        setDevOtpHint("");
        onClose();
      }, 1800);
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="auth-card"
        style={{ maxWidth: 410, position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-card-header" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 19 }}>Khôi phục mật khẩu</h2>
          <p style={{ fontSize: 13 }}>
            {step === 1
              ? "Nhập email tài khoản của bạn để nhận mã OTP 6 số."
              : "Nhập mã OTP và mật khẩu mới (toàn bộ phiên cũ sẽ tự đăng xuất)."}
          </p>
        </div>

        {error && <div className="auth-error-box">{error}</div>}
        {message && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {message}
            {devOtpHint && (
              <div style={{ marginTop: 6, fontWeight: 700, color: "#fde047" }}>
                Mã OTP (môi trường local): {devOtpHint}
              </div>
            )}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <div className="auth-field">
              <label htmlFor="fp-email">Email đã đăng ký</label>
              <input
                id="fp-email"
                type="email"
                required
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang tạo mã OTP..." : "Gửi mã OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="auth-field">
              <label htmlFor="fp-otp">Mã OTP (6 chữ số)</label>
              <input
                id="fp-otp"
                type="text"
                required
                maxLength={6}
                placeholder="Nhập 6 số OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="fp-pass">Mật khẩu mới (từ 6 ký tự)</label>
              <input
                id="fp-pass"
                type="password"
                required
                minLength={6}
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
            </button>
          </form>
        )}

        <div className="auth-switch-row" style={{ marginTop: 14 }}>
          <button type="button" className="auth-switch-link" onClick={onClose}>
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
