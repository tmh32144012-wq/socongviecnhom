const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { test } = require("./db");
const { sequelize, runSafeMigrations } = require("./models");
const { initializeDatabase } = require("./utils/seedData");
const { initSocket } = require("./socket");
const { corsOptions } = require("./utils/corsConfig");
const { createRateLimiter } = require("./middleware/rateLimit");
const { startReminderScheduler } = require("./utils/reminderScheduler");

const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const columnRoutes = require("./routes/columns");
const commentRoutes = require("./routes/comments");
const categoryRoutes = require("./routes/categories");
const taskRoutes = require("./routes/tasks");
const notificationRoutes = require("./routes/notifications");
const statsRoutes = require("./routes/stats");
const aiRoutes = require("./routes/ai");
const attachmentRoutes = require("./routes/attachments");
const collaborationRoutes = require("./routes/collaboration");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Khởi tạo Socket.io với CORS chặt chẽ & kiểm tra tokenVersion
initSocket(server);

// ==================================================
// MIDDLEWARE BẢO MẬT
// ==================================================
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Rate limiter chung cho toàn bộ API (chống spam / DDoS cơ bản)
app.use(
  "/api",
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 300,
    message: "Hệ thống nhận quá nhiều yêu cầu từ IP của bạn. Vui lòng thử lại sau giây lát!",
  })
);

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ==================================================
// ROUTE KIỂM TRA SERVER & ROUTE MOUNTING
// ==================================================
app.get("/", (req, res) => {
  res.json({
    message: "Hệ thống Quản lý Công việc Nhóm Kanban API đang hoạt động!",
    realtime: "Socket.io enabled",
    security: "Strict CORS + Rate Limiting + Single-use CAPTCHA + Whitelist Uploads + Token Revocation",
  });
});

app.use("/api", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api", columnRoutes);
app.use("/api", commentRoutes);
app.use("/api", collaborationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", attachmentRoutes);

// Global error handler
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes("CORS")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, message: "Lỗi hệ thống. Vui lòng thử lại!" });
});

// ==================================================
// KHỞI ĐỘNG SERVER
// ==================================================
async function startServer() {
  try {
    await test();

    await sequelize.sync();
    await runSafeMigrations(sequelize);
    await initializeDatabase();

    // Bật tiến trình tự động nhắc hạn công việc
    startReminderScheduler(30 * 60 * 1000);

    server.listen(PORT, () => {
      console.log("==================================================");
      console.log(`🚀 Server & Socket.io chạy tại http://localhost:${PORT}`);
      console.log("📦 SQL Server: ĐÃ KẾT NỐI | 🔒 Bảo mật: ĐÃ BẬT");
      console.log("==================================================");
    });
  } catch (error) {
    console.error("❌ Không thể khởi động server:");
    console.error(error);
  }
}

startServer();
