const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");
const { User, Category, PasswordReset, Op } = require("../models");
const authenticateToken = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { generateCaptchaCode, generateCaptchaSVG } = require("../utils/captcha");

const router = express.Router();

// ==================================================
// CHỐNG REPLAY CAPTCHA (Mỗi mã chỉ dùng đúng 1 lần)
// ==================================================
const usedCaptchaJtis = new Map(); // jti -> expiresAtMs

function consumeCaptchaToken(captchaToken, captchaInput) {
  const decoded = jwt.verify(captchaToken, JWT_SECRET);
  if (!decoded.jti) {
    throw new Error("Mã CAPTCHA không hợp lệ!");
  }
  const now = Date.now();
  // Dọn các jti đã hết hạn
  for (const [k, expMs] of usedCaptchaJtis.entries()) {
    if (now > expMs) usedCaptchaJtis.delete(k);
  }
  if (usedCaptchaJtis.has(decoded.jti)) {
    throw new Error("Mã CAPTCHA này đã được sử dụng. Vui lòng lấy mã mới!");
  }
  // Đánh dấu đã sử dụng ngay cả khi người dùng nhập sai để chống dò mã
  usedCaptchaJtis.set(decoded.jti, (decoded.exp || Math.floor(now / 1000) + 300) * 1000);

  if (String(captchaInput || "").trim().toUpperCase() !== String(decoded.code || "").toUpperCase()) {
    throw new Error("Mã CAPTCHA không chính xác!");
  }
  return true;
}

// Rate limiters chống brute-force
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại!",
});

const authActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau ít phút!",
});

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tv: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ROUTE LẤY MÃ CAPTCHA (Có jti duy nhất dùng 1 lần)
router.get("/captcha", (req, res) => {
  try {
    const code = generateCaptchaCode(6);
    const captchaSvg = generateCaptchaSVG(code);
    const jti = crypto.randomBytes(12).toString("hex");
    const captchaToken = jwt.sign(
      { code, jti, exp: Math.floor(Date.now() / 1000) + 5 * 60 },
      JWT_SECRET
    );
    res.json({ captchaToken, captchaSvg });
  } catch (error) {
    console.error("Lỗi tạo captcha:", error);
    res.status(500).json({ message: "Không thể tạo mã CAPTCHA!" });
  }
});

// REGISTER
router.post("/register", authActionLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Họ tên không được để trống!" });
    }
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ message: "Email không được để trống!" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Email không hợp lệ!" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được đăng ký!" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const totalUsers = await User.count();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      systemRole: totalUsers === 0 ? "admin" : "user",
      tokenVersion: 0,
    });

    for (const categoryName of ["Công việc", "Học tập", "Cá nhân"]) {
      await Category.create({ userId: user.id, name: categoryName });
    }

    return res.status(201).json({
      message: "Đăng ký tài khoản thành công!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra khi đăng ký!" });
  }
});

// LOGIN (Có Rate Limiter + CAPTCHA dùng 1 lần + Token Version)
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, captchaInput, captchaToken } = req.body;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập email!" });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu!" });
    }
    if (!captchaInput || typeof captchaInput !== "string" || captchaInput.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập mã CAPTCHA!" });
    }
    if (!captchaToken) {
      return res.status(400).json({ message: "Mã CAPTCHA chưa hợp lệ, vui lòng tải lại!" });
    }

    try {
      consumeCaptchaToken(captchaToken, captchaInput);
    } catch (err) {
      return res.status(400).json({
        message: err.message || "Mã CAPTCHA đã hết hạn hoặc không hợp lệ!",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { email: normalizedEmail },
      attributes: ["id", "name", "email", "passwordHash", "systemRole", "tokenVersion"],
    });

    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
    }

    const passwordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
    }

    const token = signUserToken(user);
    const fullUser = await User.findByPk(user.id, {
      attributes: ["id", "name", "email", "avatar", "systemRole", "createdAt"],
    });

    return res.json({
      message: "Đăng nhập thành công!",
      token,
      user: fullUser,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra khi đăng nhập!" });
  }
});

// ==================================================
// QUÊN MẬT KHẨU (FORGOT PASSWORD & RESET OTP)
// ==================================================
router.post("/forgot-password", authActionLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ email cần khôi phục!" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản nào đăng ký với email này!" });
    }

    // Vô hiệu hóa các OTP cũ chưa dùng
    await PasswordReset.update(
      { used: true },
      { where: { userId: user.id, used: false } }
    );

    const otpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hạn 10 phút

    await PasswordReset.create({
      userId: user.id,
      email: normalizedEmail,
      otpHash,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    console.log(`🔐 [PasswordReset OTP] Email: ${normalizedEmail} | Mã OTP: ${otpCode} (hạn 10 phút)`);

    // Trong môi trường local/dev chưa cấu hình SMTP, trả devOtp để người dùng test ngay trên giao diện
    const isProduction = process.env.NODE_ENV === "production" && Boolean(process.env.SMTP_HOST);
    res.json({
      message: isProduction
        ? "Đã gửi mã OTP đặt lại mật khẩu tới email của bạn (có hiệu lực 10 phút)."
        : "Đã tạo mã OTP đặt lại mật khẩu (hiệu lực 10 phút). Kiểm tra mã hiển thị hoặc console server.",
      ...(isProduction ? {} : { devOtp: otpCode }),
    });
  } catch (error) {
    console.error("Lỗi tạo OTP quên mật khẩu:", error);
    res.status(500).json({ message: "Không thể tạo mã khôi phục mật khẩu!" });
  }
});

router.post("/reset-password", authActionLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ Email, mã OTP (6 số) và Mật khẩu mới (>= 6 ký tự)!",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetRecord = await PasswordReset.findOne({
      where: {
        email: normalizedEmail,
        used: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!resetRecord) {
      return res.status(400).json({ message: "Mã OTP không tồn tại hoặc đã hết hạn!" });
    }

    const otpValid = await bcrypt.compare(String(otp).trim(), resetRecord.otpHash);
    if (!otpValid) {
      return res.status(400).json({ message: "Mã OTP không chính xác!" });
    }

    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại!" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Thu hồi toàn bộ phiên cũ
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    res.json({
      message: "Đặt lại mật khẩu thành công! Toàn bộ phiên cũ đã được đăng xuất. Bạn có thể đăng nhập ngay.",
    });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ message: "Không thể đặt lại mật khẩu!" });
  }
});

// LOGOUT ALL DEVICES (Thu hồi toàn bộ JWT cũ)
router.post("/logout-all", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại!" });

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: "Đã đăng xuất khỏi tất cả các thiết bị thành công!" });
  } catch (error) {
    console.error("Lỗi đăng xuất mọi thiết bị:", error);
    res.status(500).json({ message: "Không thể thu hồi phiên đăng nhập!" });
  }
});

// GET CURRENT USER PROFILE
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "avatar", "systemRole", "createdAt"],
    });
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Không thể lấy thông tin người dùng!" });
  }
});

// UPDATE PROFILE
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Họ tên không được để trống!" });
    }
    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ message: "Email không được để trống!" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Email không hợp lệ!" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ message: "Email này đã được sử dụng bởi tài khoản khác!" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại!" });

    user.name = name.trim();
    user.email = normalizedEmail;
    await user.save();

    const newToken = signUserToken(user);
    const updatedUser = await User.findByPk(user.id, {
      attributes: ["id", "name", "email", "avatar", "systemRole", "createdAt"],
    });

    res.json({
      message: "Cập nhật thông tin thành công!",
      user: updatedUser,
      token: newToken,
    });
  } catch (error) {
    console.error("Lỗi cập nhật thông tin cá nhân:", error);
    res.status(500).json({ message: "Không thể cập nhật thông tin cá nhân!" });
  }
});

// CHANGE PASSWORD (Tự tăng tokenVersion & cấp token mới cho thiết bị hiện tại)
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại!" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Xác nhận mật khẩu mới không khớp!" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại!" });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác!" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const newToken = signUserToken(user);

    res.json({
      message: "Đổi mật khẩu thành công! Các phiên đăng nhập trên thiết bị khác đã được thu hồi.",
      token: newToken,
    });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: "Không thể đổi mật khẩu!" });
  }
});

// UPDATE AVATAR
router.put("/avatar", authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại!" });

    user.avatar = avatar || null;
    await user.save();

    res.json({ message: "Cập nhật ảnh đại diện thành công!", avatar: user.avatar });
  } catch (error) {
    console.error("Lỗi cập nhật ảnh đại diện:", error);
    res.status(500).json({ message: "Không thể cập nhật ảnh đại diện!" });
  }
});

// DELETE ACCOUNT
router.delete("/account", authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu để xác nhận xóa tài khoản!" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại!" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu xác nhận không chính xác!" });
    }

    const {
      Task,
      TaskProgressStep,
      TaskAssignee,
      TaskComment,
      BoardMember,
      Notification,
      Attachment,
      ActivityLog,
      BoardMessage,
    } = require("../models");

    const userTasks = await Task.findAll({ where: { userId: user.id } });
    const taskIds = userTasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await TaskProgressStep.destroy({ where: { taskId: taskIds } });
      await TaskAssignee.destroy({ where: { taskId: taskIds } });
      await TaskComment.destroy({ where: { taskId: taskIds } });
      await Attachment.destroy({ where: { taskId: taskIds } });
    }
    await TaskAssignee.destroy({ where: { userId: user.id } });
    await TaskComment.destroy({ where: { userId: user.id } });
    await BoardMessage.destroy({ where: { userId: user.id } });
    await ActivityLog.destroy({ where: { userId: user.id } });
    await BoardMember.destroy({ where: { userId: user.id } });
    await Attachment.destroy({ where: { userId: user.id } });
    await Notification.destroy({ where: { userId: user.id } });
    await Task.destroy({ where: { userId: user.id } });
    await Category.destroy({ where: { userId: user.id } });
    await user.destroy();

    res.json({ message: "Tài khoản của bạn đã được xóa vĩnh viễn!" });
  } catch (error) {
    console.error("Lỗi xóa tài khoản:", error);
    res.status(500).json({ message: "Không thể xóa tài khoản!" });
  }
});

module.exports = router;
module.exports.consumeCaptchaToken = consumeCaptchaToken;
