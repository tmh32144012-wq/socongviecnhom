/**
 * In-memory Sliding Window Rate Limiter (không cần cài thêm thư viện ngoài)
 * Chống Brute-Force đăng nhập, spam OTP và spam API
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = "Quá nhiều yêu cầu, vui lòng thử lại sau!" } = {}) {
  const store = new Map();

  // Định kỳ dọn dẹp các IP hết hạn để tránh rò rỉ bộ nhớ
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));
  if (cleanupInterval.unref) cleanupInterval.unref();

  const middleware = (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown";
    const key = `${ip}:${req.baseUrl || ""}:${req.path || ""}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: retryAfterSec,
      });
    }

    next();
  };

  middleware._store = store;
  return middleware;
}

module.exports = { createRateLimiter };
