/**
 * REAL OAUTH 2.0 AUTHENTICATION FOR KANOFLOW (GOOGLE & FACEBOOK)
 * - Authorization Code Flow verified server-side (zero client-side secret exposure)
 * - Signed short-lived `state` JWT for CSRF protection
 * - Single-use 60-second `oauth_code` exchange so JWT is never leaked in URL history
 * - Auto-links existing account with matching email or provisions new user + starter workspace
 */

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");
const {
  User,
  Category,
  Board,
  BoardMember,
  BoardColumn,
} = require("../models");

const router = express.Router();

// Single-use exchange codes (code -> { token, user, provider, expiresAt })
const pendingOAuthExchanges = new Map();
const EXCHANGE_TTL_MS = 60 * 1000;

function pruneExpiredExchanges() {
  const now = Date.now();
  for (const [k, v] of pendingOAuthExchanges.entries()) {
    if (!v || now > v.expiresAt) pendingOAuthExchanges.delete(k);
  }
}

function getUrls() {
  const port = process.env.PORT || 5000;
  const serverUrl = (process.env.SERVER_URL || `http://localhost:${port}`).replace(/\/+$/, "");
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  return {
    serverUrl,
    clientUrl,
    googleCallbackUrl: `${serverUrl}/api/auth/google/callback`,
    facebookCallbackUrl: `${serverUrl}/api/auth/facebook/callback`,
  };
}

function getProviderConfig() {
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const facebookAppId = (process.env.FACEBOOK_APP_ID || "").trim();
  const facebookAppSecret = (process.env.FACEBOOK_APP_SECRET || "").trim();
  return {
    googleEnabled: Boolean(googleClientId && googleClientSecret),
    facebookEnabled: Boolean(facebookAppId && facebookAppSecret),
    googleClientId,
    googleClientSecret,
    facebookAppId,
    facebookAppSecret,
  };
}

function signState(provider) {
  return jwt.sign(
    { purpose: "oauth_state", provider, nonce: crypto.randomBytes(12).toString("hex") },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
}

function verifyState(stateToken, expectedProvider) {
  const decoded = jwt.verify(stateToken, JWT_SECRET);
  if (decoded.purpose !== "oauth_state" || decoded.provider !== expectedProvider) {
    throw new Error("OAuth state mismatch");
  }
  return decoded;
}

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tv: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function createExchangeCode({ token, user, provider }) {
  pruneExpiredExchanges();
  const code = crypto.randomBytes(24).toString("hex");
  pendingOAuthExchanges.set(code, {
    token,
    user,
    provider,
    expiresAt: Date.now() + EXCHANGE_TTL_MS,
  });
  return code;
}

async function provisionStarterData(userId) {
  try {
    const defaultCats = [
      { name: "Công việc", color: "#0f766e" },
      { name: "Học tập", color: "#2563eb" },
      { name: "Cá nhân", color: "#d97706" },
    ];
    for (const c of defaultCats) {
      await Category.create({ userId, name: c.name, color: c.color });
    }

    const now = new Date();
    const board = await Board.create({
      name: "Không gian làm việc của tôi",
      description: "Bảng Kanban mặc định được tạo tự động cho tài khoản mới.",
      coverColor: "#0f766e",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await BoardMember.create({
      boardId: board.id,
      userId,
      role: "owner",
      status: "accepted",
      joinedAt: now,
    });
    const cols = [
      { title: "To Do", color: "#64748b", isDone: false, position: 0 },
      { title: "Doing", color: "#0284c7", isDone: false, position: 1 },
      { title: "Done", color: "#15803d", isDone: true, position: 2 },
    ];
    for (const col of cols) {
      await BoardColumn.create({ boardId: board.id, ...col, createdAt: now });
    }
  } catch (err) {
    console.warn("OAuth starter provisioning warning:", err.message);
  }
}

async function findOrCreateOAuthUser({ provider, providerId, email, name, avatar }) {
  const idField = provider === "google" ? "googleId" : "facebookId";
  const normalizedEmail = String(email || "").trim().toLowerCase();

  // 1. Tìm theo Google ID / Facebook ID trước
  let user = await User.findOne({ where: { [idField]: String(providerId) } });

  // 2. Nếu chưa có, tìm theo Email để liên kết tài khoản hiện có (giữ nguyên toàn bộ dữ liệu)
  if (!user && normalizedEmail) {
    user = await User.findOne({ where: { email: normalizedEmail } });
    if (user) {
      user[idField] = String(providerId);
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }
  }

  // 3. Nếu là người dùng mới hoàn toàn -> tạo mới + khởi tạo danh mục & bảng Kanban mặc định
  if (!user) {
    const safeEmail =
      normalizedEmail || `${provider}_${providerId}@${provider}.kanoflow.local`;
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    user = await User.create({
      name: (name || "Thành viên KanoFlow").trim().slice(0, 100),
      email: safeEmail,
      passwordHash: randomPasswordHash,
      avatar: avatar || null,
      systemRole: "user",
      tokenVersion: 0,
      authProvider: provider,
      [idField]: String(providerId),
      createdAt: new Date(),
    });
    await provisionStarterData(user.id);
  } else if (!user.avatar && avatar) {
    user.avatar = avatar;
    await user.save();
  }

  const fullUser = await User.findByPk(user.id, {
    attributes: ["id", "name", "email", "avatar", "systemRole", "authProvider", "createdAt"],
  });
  return { user: fullUser.toJSON(), token: signUserToken(user) };
}

// ==================================================
// 1. GET /api/auth/oauth/providers — Trạng thái cấu hình Google & Facebook
// ==================================================
router.get("/oauth/providers", (req, res) => {
  const cfg = getProviderConfig();
  const urls = getUrls();
  res.json({
    google: cfg.googleEnabled,
    facebook: cfg.facebookEnabled,
    googleCallbackUrl: urls.googleCallbackUrl,
    facebookCallbackUrl: urls.facebookCallbackUrl,
  });
});

// ==================================================
// 2. GOOGLE OAUTH 2.0
// ==================================================
router.get("/google", (req, res) => {
  const cfg = getProviderConfig();
  const { clientUrl, googleCallbackUrl } = getUrls();

  if (!cfg.googleEnabled) {
    return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_NOT_CONFIGURED`);
  }

  const params = new URLSearchParams({
    client_id: cfg.googleClientId,
    redirect_uri: googleCallbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: signState("google"),
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/callback", async (req, res) => {
  const { clientUrl, googleCallbackUrl } = getUrls();
  const cfg = getProviderConfig();

  try {
    if (req.query.error) {
      return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_CANCELLED`);
    }
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_INVALID_CALLBACK`);
    }
    verifyState(String(state), "google");

    // Đổi authorization code lấy access_token từ Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: cfg.googleClientId,
        client_secret: cfg.googleClientSecret,
        redirect_uri: googleCallbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange error:", tokenData);
      return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_TOKEN_FAILED`);
    }

    // Lấy thông tin hồ sơ đã xác thực từ Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub) {
      console.error("Google userinfo error:", profile);
      return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_PROFILE_FAILED`);
    }

    const { user, token } = await findOrCreateOAuthUser({
      provider: "google",
      providerId: profile.sub,
      email: profile.email,
      name: profile.name || profile.given_name || "Người dùng Google",
      avatar: profile.picture || null,
    });

    const exchangeCode = createExchangeCode({ token, user, provider: "google" });
    return res.redirect(`${clientUrl}/?oauth_code=${encodeURIComponent(exchangeCode)}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err.message);
    return res.redirect(`${clientUrl}/?oauth_error=GOOGLE_AUTH_FAILED`);
  }
});

// ==================================================
// 3. FACEBOOK OAUTH 2.0
// ==================================================
router.get("/facebook", (req, res) => {
  const cfg = getProviderConfig();
  const { clientUrl, facebookCallbackUrl } = getUrls();

  if (!cfg.facebookEnabled) {
    return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_NOT_CONFIGURED`);
  }

  const params = new URLSearchParams({
    client_id: cfg.facebookAppId,
    redirect_uri: facebookCallbackUrl,
    response_type: "code",
    scope: "public_profile,email",
    state: signState("facebook"),
  });

  return res.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
});

router.get("/facebook/callback", async (req, res) => {
  const { clientUrl, facebookCallbackUrl } = getUrls();
  const cfg = getProviderConfig();

  try {
    if (req.query.error) {
      return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_CANCELLED`);
    }
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_INVALID_CALLBACK`);
    }
    verifyState(String(state), "facebook");

    // Đổi authorization code lấy access_token từ Facebook Graph API
    const tokenParams = new URLSearchParams({
      client_id: cfg.facebookAppId,
      client_secret: cfg.facebookAppSecret,
      redirect_uri: facebookCallbackUrl,
      code: String(code),
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Facebook token exchange error:", tokenData);
      return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_TOKEN_FAILED`);
    }

    // Lấy thông tin hồ sơ từ Facebook Graph API
    const profileRes = await fetch(
      "https://graph.facebook.com/v20.0/me?fields=id,name,email,picture.type(large)",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.id) {
      console.error("Facebook profile error:", profile);
      return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_PROFILE_FAILED`);
    }

    const { user, token } = await findOrCreateOAuthUser({
      provider: "facebook",
      providerId: profile.id,
      email: profile.email || "",
      name: profile.name || "Người dùng Facebook",
      avatar: profile.picture?.data?.url || null,
    });

    const exchangeCode = createExchangeCode({ token, user, provider: "facebook" });
    return res.redirect(`${clientUrl}/?oauth_code=${encodeURIComponent(exchangeCode)}`);
  } catch (err) {
    console.error("Facebook OAuth callback error:", err.message);
    return res.redirect(`${clientUrl}/?oauth_error=FACEBOOK_AUTH_FAILED`);
  }
});

// ==================================================
// 4. POST /api/auth/oauth/exchange — Đổi mã 1 lần lấy JWT & User
// ==================================================
router.post("/oauth/exchange", (req, res) => {
  pruneExpiredExchanges();
  const code = String(req.body?.code || "").trim();
  if (!code) {
    return res.status(400).json({ message: "Thiếu mã xác thực OAuth!" });
  }
  const entry = pendingOAuthExchanges.get(code);
  pendingOAuthExchanges.delete(code); // Dùng đúng 1 lần duy nhất
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(400).json({ message: "Phiên đăng nhập mạng xã hội đã hết hạn. Vui lòng thử lại!" });
  }

  return res.json({
    message:
      entry.provider === "google"
        ? "Đăng nhập bằng Google thành công!"
        : "Đăng nhập bằng Facebook thành công!",
    provider: entry.provider,
    token: entry.token,
    user: entry.user,
  });
});

module.exports = router;
module.exports._test = {
  createExchangeCode,
  findOrCreateOAuthUser,
};
