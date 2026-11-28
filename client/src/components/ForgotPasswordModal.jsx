import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_ENDPOINTS } from "../config/api";

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function getPasswordStrength(pw) {
  if (!pw) return { label: "", color: "transparent", width: "0%" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { label: "Yếu", color: "#ef4444", width: "28%" };
  if (score === 2) return { label: "Trung bình", color: "#f59e0b", width: "58%" };
  if (score === 3) return { label: "Khá mạnh", color: "#10b981", width: "82%" };
  return { label: "Rất mạnh", color: "#22c55e", width: "100%" };
}

function ForgotPasswordModal({ isOpen, onClose, initialEmail = "", onResetSuccess }) {
  // 1: Nhập email -> 2: Xác thực OTP -> 3: Đặt mật khẩu mới -> 4: Hoàn tất
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [devOtpHint, setDevOtpHint] = useState("");
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const wasOpenRef = useRef(false);

  // Chỉ reset state khi hộp thoại chuyển từ ĐÓNG -> MỞ (tránh reset mất Bước 4 khi onResetSuccess cập nhật email ở trang Đăng nhập)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep(1);
      setEmail(initialEmail || "");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setDevOtpHint("");
      setOtpSecondsLeft(0);
      setResendCooldown(0);
      setMessage("");
      setError("");
      setLoading(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialEmail]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, onClose]);

  // Đếm ngược thời hạn mã OTP & thời gian chờ gửi lại
  useEffect(() => {
    if (!isOpen || (otpSecondsLeft <= 0 && resendCooldown <= 0)) return;
    const timer = window.setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, otpSecondsLeft, resendCooldown]);

  if (!isOpen) return null;

  const requestOtp = async (targetEmail) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Vui lòng nhập địa chỉ email đúng định dạng.");
      return false;
    }

    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.forgotPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Không thể gửi mã OTP.");
        return false;
      }

      setEmail(cleanEmail);
      setOtp("");
      setDevOtpHint(data.devOtp || "");
      setOtpSecondsLeft(data.expiresInSeconds || 600);
      setResendCooldown(30);
      setMessage(data.message || "Đã tạo mã OTP 6 chữ số.");
      setStep(2);
      return true;
    } catch {
      setError("Không thể kết nối đến máy chủ. Hãy đảm bảo server đang chạy.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Bước 1: Yêu cầu mã OTP
  const handleRequestOtpSubmit = async (e) => {
    e.preventDefault();
    await requestOtp(email);
  };

  // Bước 2: Xác thực mã OTP trước khi sang bước đặt mật khẩu mới
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (otpSecondsLeft === 0) {
      setError("Mã OTP đã hết hạn. Vui lòng bấm 'Gửi lại mã OTP' để lấy mã mới.");
      return;
    }

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Mã OTP phải gồm đúng 6 chữ số.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.verifyResetOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: cleanOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Mã OTP không hợp lệ.");
        if (data.code === "OTP_LOCKED") {
          setOtp("");
          setDevOtpHint("");
          setOtpSecondsLeft(0);
        }
        return;
      }

      setMessage(data.message || "Mã OTP hợp lệ! Hãy đặt mật khẩu mới.");
      setStep(3);
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: Đặt mật khẩu mới (kiểm tra khớp + khác mật khẩu cũ ở server)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp. Vui lòng kiểm tra lại.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.resetPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Đặt lại mật khẩu thất bại.");
        if (data.code === "OTP_LOCKED") {
          setStep(2);
          setOtp("");
          setOtpSecondsLeft(0);
        }
        return;
      }

      setMessage(data.message || "Đặt lại mật khẩu thành công!");
      setStep(4);
      onResetSuccess?.(email.trim());
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);
  const stepLabels = [
    { num: 1, label: "1. Email" },
    { num: 2, label: "2. Xác thực OTP" },
    { num: 3, label: "3. Mật khẩu mới" },
  ];

  return createPortal(
    <div
      className="team-modal-backdrop"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="auth-card"
        style={{
          maxWidth: 440,
          width: "100%",
          position: "relative",
          margin: "auto",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-modal-title"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div className="auth-card-header" style={{ marginBottom: 0 }}>
            <h2 id="fp-modal-title" style={{ fontSize: 19 }}>
              Khôi phục mật khẩu
            </h2>
            <p style={{ fontSize: 13 }}>
              {step === 1 && "Nhập email tài khoản để nhận mã xác thực OTP 6 chữ số."}
              {step === 2 && `Nhập mã OTP 6 số đã cấp cho ${email}.`}
              {step === 3 && "Mã OTP đã xác thực. Tạo mật khẩu mới cho tài khoản của bạn."}
              {step === 4 && "Mật khẩu đã được cập nhật và toàn bộ phiên cũ đã được đăng xuất."}
            </p>
          </div>
          <button
            type="button"
            className="team-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng cửa sổ"
          >
            ×
          </button>
        </div>

        {/* Thanh tiến trình 3 bước rõ ràng */}
        {step <= 3 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {stepLabels.map((item) => {
              const done = step > item.num;
              const active = step === item.num;
              return (
                <div
                  key={item.num}
                  style={{
                    fontSize: 11.5,
                    fontWeight: active || done ? 700 : 500,
                    textAlign: "center",
                    padding: "6px 6px",
                    borderRadius: 8,
                    border: `1px solid ${
                      done
                        ? "rgba(16, 185, 129, 0.4)"
                        : active
                        ? "var(--accent-color)"
                        : "var(--border-color)"
                    }`,
                    background: done
                      ? "rgba(16, 185, 129, 0.14)"
                      : active
                      ? "var(--accent-soft)"
                      : "var(--bg-input)",
                    color: done
                      ? "var(--success)"
                      : active
                      ? "var(--accent-color)"
                      : "var(--text-muted)",
                  }}
                >
                  {done ? `✓ ${item.label.slice(3)}` : item.label}
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="auth-error-box">{error}</div>}

        {message && step !== 4 && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.32)",
              color: "var(--success)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12.5,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            <div>{message}</div>
            {step === 2 && devOtpHint && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px dashed rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--warning)" }}>
                  OTP local (mô phỏng email): <code style={{ fontSize: 14, letterSpacing: 2 }}>{devOtpHint}</code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtp(devOtpHint);
                    setError("");
                  }}
                  style={{
                    border: "1px solid var(--border-strong)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    borderRadius: 6,
                    padding: "3px 9px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Điền nhanh
                </button>
              </div>
            )}
          </div>
        )}

        {/* BƯỚC 1: NHẬP EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOtpSubmit}>
            <div className="auth-field">
              <label htmlFor="fp-email">Email đã đăng ký</label>
              <input
                id="fp-email"
                type="email"
                required
                autoFocus
                placeholder="tenban@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang gửi mã OTP..." : "Tiếp tục & Gửi mã OTP"}
            </button>
          </form>
        )}

        {/* BƯỚC 2: XÁC THỰC MÃ OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpSubmit}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12.5,
                color: "var(--text-secondary)",
                marginBottom: 12,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
              }}
            >
              <span>
                Hiệu lực mã:{" "}
                <strong style={{ color: otpSecondsLeft > 60 ? "var(--text-primary)" : "var(--danger)" }}>
                  {otpSecondsLeft > 0 ? formatTimer(otpSecondsLeft) : "Đã hết hạn"}
                </strong>
              </span>
              <button
                type="button"
                className="auth-switch-link"
                style={{ fontSize: 12, marginLeft: 0 }}
                disabled={loading}
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                  setMessage("");
                  setDevOtpHint("");
                }}
              >
                ← Đổi email
              </button>
            </div>

            <div className="auth-field">
              <label htmlFor="fp-otp">Mã OTP (6 chữ số)</label>
              <input
                id="fp-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
                placeholder="Nhập 6 chữ số OTP"
                style={{ letterSpacing: "0.28em", fontWeight: 700, textAlign: "center", fontSize: 16 }}
                value={otp}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(digitsOnly);
                  if (error) setError("");
                }}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}
            >
              {loading ? "Đang xác thực..." : "Xác thực mã OTP"}
            </button>

            <div style={{ textAlign: "center", marginTop: 12, fontSize: 12.5, color: "var(--text-secondary)" }}>
              Chưa nhận được mã hoặc mã hết hạn?{" "}
              <button
                type="button"
                className="auth-switch-link"
                disabled={loading || resendCooldown > 0}
                onClick={() => requestOtp(email)}
                style={{ opacity: resendCooldown > 0 ? 0.6 : 1 }}
              >
                {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã OTP"}
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 3: ĐẶT MẬT KHẨU MỚI */}
        {step === 3 && (
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="auth-field">
              <label htmlFor="fp-pass">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <div className="auth-password-wrap">
                <input
                  id="fp-pass"
                  type={showNewPassword ? "text" : "password"}
                  required
                  autoFocus
                  minLength={6}
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError("");
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowNewPassword((p) => !p)}
                  aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showNewPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {newPassword && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 99,
                      background: "var(--border-color)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: strength.width,
                        background: strength.color,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11.5, color: strength.color, marginTop: 3, fontWeight: 600 }}>
                    Độ mạnh: {strength.label}
                  </div>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="fp-confirm-pass">Xác nhận mật khẩu mới</label>
              <div className="auth-password-wrap">
                <input
                  id="fp-confirm-pass"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                >
                  {showConfirmPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>
                  Mật khẩu xác nhận chưa khớp.
                </div>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Đang cập nhật mật khẩu..." : "Lưu mật khẩu mới"}
            </button>
          </form>
        )}

        {/* BƯỚC 4: HOÀN TẤT */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                margin: "0 auto 12px",
                background: "rgba(16, 185, 129, 0.16)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.55 }}>
              {message}
            </p>
            <button type="button" className="auth-submit-btn" onClick={onClose}>
              Đăng nhập ngay với mật khẩu mới
            </button>
          </div>
        )}

        {step !== 4 && (
          <div className="auth-switch-row" style={{ marginTop: 14 }}>
            <button type="button" className="auth-switch-link" onClick={onClose} disabled={loading}>
              Hủy &amp; đóng cửa sổ
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ForgotPasswordModal;
