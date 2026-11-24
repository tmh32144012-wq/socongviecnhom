/**
 * Kiểm tra Origin chặt chẽ cho cả Express CORS lẫn Socket.io
 * Chỉ cho phép localhost, 127.0.0.1 và danh sách trong biến môi trường CLIENT_URL / ALLOWED_ORIGINS
 */
function getAllowedOrigins() {
  const raw = [process.env.CLIENT_URL, process.env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .join(",");
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isOriginAllowed(origin) {
  // Cho phép request server-to-server hoặc công cụ nội bộ không gửi Origin
  if (!origin) return true;

  const cleanOrigin = origin.replace(/\/+$/, "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(cleanOrigin)) {
    return true;
  }

  const whitelist = getAllowedOrigins();
  return whitelist.includes(cleanOrigin);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin "${origin}" bị từ chối bởi chính sách CORS!`), false);
  },
  credentials: true,
};

module.exports = {
  isOriginAllowed,
  corsOptions,
};
