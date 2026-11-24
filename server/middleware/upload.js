const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Đảm bảo thư mục upload tồn tại
const uploadDir = path.join(__dirname, "..", "uploads", "attachments");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Danh sách TRẮNG (Whitelist) các phần mở rộng an toàn được phép tải lên
// Chặn triệt để .html, .svg, .js, .php, .exe, .bat... tránh Stored XSS và RCE
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".pdf", ".txt", ".csv", ".md", ".json",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".rar", ".7z",
]);

const ALLOWED_MIME_PREFIXES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/octet-stream",
];

// Giới hạn dung lượng tối đa: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isAllowedUploadFile(originalName = "", mimeType = "") {
  const ext = path.extname(String(originalName)).toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      reason: `Định dạng tệp "${ext || "không xác định"}" không nằm trong danh sách cho phép (chỉ nhận Ảnh, PDF, Office, TXT/CSV, ZIP/RAR).`,
    };
  }

  if (mimeType) {
    const lowerMime = String(mimeType).toLowerCase();
    // Chặn tuyệt đối SVG / HTML giả mạo MIME
    if (lowerMime.includes("svg") || lowerMime.includes("html") || lowerMime.includes("javascript")) {
      return {
        allowed: false,
        reason: `Loại nội dung "${mimeType}" không được phép vì lý do bảo mật!`,
      };
    }
    const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) => lowerMime.startsWith(prefix));
    if (!mimeOk) {
      return {
        allowed: false,
        reason: `MIME type "${mimeType}" không được hỗ trợ.`,
      };
    }
  }

  return { allowed: true };
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const randomHex = crypto.randomBytes(16).toString("hex");
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const check = isAllowedUploadFile(file.originalname, file.mimetype);
  if (!check.allowed) {
    return cb(new Error(check.reason), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter,
});

module.exports = {
  upload,
  uploadDir,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  isAllowedUploadFile,
};
