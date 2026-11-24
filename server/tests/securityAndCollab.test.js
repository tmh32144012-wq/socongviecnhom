const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { isOriginAllowed } = require("../utils/corsConfig");
const { isAllowedUploadFile } = require("../middleware/upload");
const { createRateLimiter } = require("../middleware/rateLimit");
const { calculateNextDate } = require("../utils/recurrenceHelper");
const { JWT_SECRET } = require("../config/jwt");
const { consumeCaptchaToken } = require("../routes/auth");

test("CORS chặn các tên miền lạ và cho phép localhost", () => {
  assert.equal(isOriginAllowed("http://localhost:5173"), true);
  assert.equal(isOriginAllowed("http://127.0.0.1:3000"), true);
  assert.equal(isOriginAllowed("https://evil-attacker.com"), false);
  assert.equal(isOriginAllowed("http://phishing-site.net"), false);
});

test("Whitelist Upload chặn .html, .svg, .exe, .js và cho phép .pdf, .png, .docx", () => {
  assert.equal(isAllowedUploadFile("report.pdf", "application/pdf").allowed, true);
  assert.equal(isAllowedUploadFile("avatar.png", "image/png").allowed, true);
  assert.equal(isAllowedUploadFile("plan.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document").allowed, true);

  assert.equal(isAllowedUploadFile("xss.svg", "image/svg+xml").allowed, false);
  assert.equal(isAllowedUploadFile("payload.html", "text/html").allowed, false);
  assert.equal(isAllowedUploadFile("malware.exe", "application/octet-stream").allowed, false);
  assert.equal(isAllowedUploadFile("shell.js", "application/javascript").allowed, false);
});

test("CAPTCHA dùng đúng 1 lần duy nhất (chống Replay Attack)", () => {
  const token = jwt.sign(
    { code: "AB12CD", jti: "test-jti-unique-001", exp: Math.floor(Date.now() / 1000) + 300 },
    JWT_SECRET
  );

  // Lần đầu tiên khớp mã -> thành công
  assert.equal(consumeCaptchaToken(token, "ab12cd"), true);

  // Lần thứ hai tái sử dụng cùng token -> bị từ chối
  assert.throws(() => consumeCaptchaToken(token, "ab12cd"), /đã được sử dụng/i);
});

test("Rate Limiter chặn khi vượt quá giới hạn số request trong cửa sổ thời gian", () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 2, message: "Blocked" });
  let statusCode = 200;
  let nextCalls = 0;

  const mockReq = { headers: {}, socket: { remoteAddress: "10.0.0.1" }, baseUrl: "/api", path: "/login" };
  const mockRes = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { statusCode = c; return this; },
    json() { return this; },
  };
  const next = () => { nextCalls += 1; };

  limiter(mockReq, mockRes, next);
  limiter(mockReq, mockRes, next);
  limiter(mockReq, mockRes, next); // Lần 3 phải bị 429

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.ok(mockRes.headers["Retry-After"]);
});

test("Tính ngày chu kỳ tiếp theo cho công việc lặp lại (daily, weekly, monthly)", () => {
  assert.equal(calculateNextDate("2026-11-24", "daily"), "2026-11-25");
  assert.equal(calculateNextDate("2026-11-24", "weekly"), "2026-12-01");
  assert.equal(calculateNextDate("2026-11-24", "monthly"), "2026-12-24");
  assert.equal(calculateNextDate("2026-11-24", "none"), null);
});
