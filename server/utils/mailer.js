/**
 * SMTP EMAIL SERVICE (Nodemailer) CHO KANOFLOW
 * - Dùng cho: OTP Quên mật khẩu & Lời mời tham gia Không gian làm việc (Board)
 * - Tự động fallback an toàn về chế độ local nếu chưa cấu hình SMTP_* trong server/.env
 */

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

let cachedTransporter = null;
let cachedConfigKey = "";

function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from =
    (process.env.SMTP_FROM || "").trim() ||
    (user ? `"KanoFlow Workspace" <${user}>` : '"KanoFlow Workspace" <no-reply@kanoflow.local>');

  return { host, port, secure, user, pass, from };
}

function isSmtpConfigured() {
  const cfg = getSmtpConfig();
  return Boolean(nodemailer && cfg.host && cfg.user && cfg.pass);
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  const cfg = getSmtpConfig();
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (!cachedTransporter || cachedConfigKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    cachedConfigKey = key;
  }
  return cachedTransporter;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendMailSafe({ to, subject, text, html }) {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }
  try {
    const transporter = getTransporter();
    const { from } = getSmtpConfig();
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log(`📧 [KanoFlow Mailer] Đã gửi email tới ${to} (messageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`⚠️ [KanoFlow Mailer] Gửi email tới ${to} thất bại (${err.message}) — chuyển sang chế độ fallback local.`);
    return { sent: false, reason: err.message };
  }
}

async function sendPasswordResetOtpEmail({ to, userName, otp, expiresMinutes = 10 }) {
  const safeName = escapeHtml(userName || "Bạn");
  const safeOtp = escapeHtml(otp);
  const subject = `[KanoFlow] Mã OTP khôi phục mật khẩu: ${otp}`;
  const text = `Xin chào ${userName || "bạn"},\n\nMã OTP khôi phục mật khẩu KanoFlow của bạn là: ${otp}\nMã có hiệu lực trong ${expiresMinutes} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 14px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #0f766e, #0284c7); padding: 22px 26px;">
        <h2 style="margin: 0; font-size: 20px; color: #ffffff; letter-spacing: 0.3px;">KanoFlow</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.88);">Khôi phục mật khẩu tài khoản</p>
      </div>
      <div style="padding: 24px 26px;">
        <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
          Xin chào <strong>${safeName}</strong>,
        </p>
        <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Bạn vừa yêu cầu đặt lại mật khẩu trên hệ thống <strong>KanoFlow</strong>. Vui lòng nhập mã xác thực OTP bên dưới:
        </p>
        <div style="text-align: center; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 18px;">
          <span style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #34d399; font-family: Consolas, monospace;">${safeOtp}</span>
        </div>
        <p style="margin: 0; font-size: 12.5px; color: #94a3b8; line-height: 1.55;">
          • Mã OTP có hiệu lực trong <strong>${expiresMinutes} phút</strong> và tự khóa sau 5 lần nhập sai.<br />
          • Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
        </p>
      </div>
    </div>
  `;
  return sendMailSafe({ to, subject, text, html });
}

async function sendBoardInvitationEmail({ to, inviteeName, inviterName, boardName, role = "member", mode = "invite" }) {
  const safeInvitee = escapeHtml(inviteeName || "Bạn");
  const safeInviter = escapeHtml(inviterName || "Quản trị viên");
  const safeBoard = escapeHtml(boardName || "Không gian làm việc");
  const roleLabel = role === "admin" ? "Quản trị viên" : "Thành viên";
  const isDirect = mode === "direct";
  const appUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

  const subject = isDirect
    ? `[KanoFlow] Bạn đã được thêm vào dự án "${boardName}"`
    : `[KanoFlow] ${inviterName || "Đồng đội"} mời bạn tham gia dự án "${boardName}"`;

  const text = isDirect
    ? `Xin chào ${inviteeName || "bạn"},\n\n${inviterName || "Quản trị viên"} đã thêm bạn vào dự án "${boardName}" với vai trò ${roleLabel}. Truy cập ngay tại ${appUrl}`
    : `Xin chào ${inviteeName || "bạn"},\n\n${inviterName || "Quản trị viên"} đã mời bạn tham gia dự án "${boardName}" với vai trò ${roleLabel}. Hãy mở KanoFlow (${appUrl}) -> mục Không gian làm việc để xác nhận lời mời!`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 14px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #0f766e, #2563eb); padding: 22px 26px;">
        <h2 style="margin: 0; font-size: 20px; color: #ffffff;">KanoFlow</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.88);">Cộng tác không gian làm việc nhóm</p>
      </div>
      <div style="padding: 24px 26px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #e2e8f0;">Xin chào <strong>${safeInvitee}</strong>,</p>
        <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          <strong>${safeInviter}</strong> đã ${isDirect ? "thêm bạn vào" : "mời bạn tham gia"} dự án
          <strong style="color: #38bdf8;">"${safeBoard}"</strong> với vai trò <strong>${roleLabel}</strong>.
        </p>
        <a href="${escapeHtml(appUrl)}" style="display: inline-block; padding: 11px 20px; border-radius: 9px; background: #10b981; color: #052e16; font-weight: 700; font-size: 13.5px; text-decoration: none;">
          Mở KanoFlow ngay
        </a>
      </div>
    </div>
  `;
  return sendMailSafe({ to, subject, text, html });
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetOtpEmail,
  sendBoardInvitationEmail,
};
