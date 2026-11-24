const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");
const { User } = require("../models");

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Bạn chưa đăng nhập hoặc token không hợp lệ!",
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ!" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id },
      attributes: ["id", "name", "email", "systemRole", "tokenVersion"],
    });

    if (!user) {
      return res.status(401).json({ message: "Tài khoản không tồn tại!" });
    }

    // Kiểm tra thu hồi phiên (Token Revocation) khi người dùng đổi mật khẩu / đăng xuất mọi thiết bị
    const tokenTv = typeof decoded.tv === "number" ? decoded.tv : 0;
    const currentTv = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
    if (tokenTv !== currentTv) {
      return res.status(401).json({
        message: "Phiên đăng nhập đã bị thu hồi (mật khẩu vừa thay đổi hoặc đã đăng xuất từ xa). Vui lòng đăng nhập lại!",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.systemRole || "user",
      tokenVersion: currentTv,
    };

    next();
  } catch (error) {
    console.error("Lỗi xác thực token:", error.message);
    return res.status(401).json({
      message: "Phiên đăng nhập đã hết hạn hoặc token không hợp lệ!",
    });
  }
}

module.exports = authenticateToken;
