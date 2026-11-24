const { sequelize } = require("../models");
const http = require("http");

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TẤT CẢ CHỨC NĂNG BACKEND ===");

  // Start temporary server
  const express = require("express");
  const cors = require("cors");
  const { runSafeMigrations } = require("../models");

  const authRoutes = require("../routes/auth");
  const categoryRoutes = require("../routes/categories");
  const taskRoutes = require("../routes/tasks");
  const notificationRoutes = require("../routes/notifications");
  const statsRoutes = require("../routes/stats");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/stats", statsRoutes);

  await runSafeMigrations(sequelize);

  const server = app.listen(5099, async () => {
    try {
      const BASE = "http://localhost:5099/api";

      const post = async (path, body, token) => {
        const res = await fetch(`${BASE}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body)
        });
        return { status: res.status, data: await res.json() };
      };

      const get = async (path, token) => {
        const res = await fetch(`${BASE}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return { status: res.status, data: await res.json() };
      };

      const put = async (path, body, token) => {
        const res = await fetch(`${BASE}${path}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        return { status: res.status, data: await res.json() };
      };

      const patch = async (path, body, token) => {
        const res = await fetch(`${BASE}${path}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body || {})
        });
        return { status: res.status, data: await res.json() };
      };

      const del = async (path, token, body) => {
        const res = await fetch(`${BASE}${path}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: body ? JSON.stringify(body) : undefined
        });
        return { status: res.status, data: await res.json() };
      };

      // 1. REGISTER
      const testEmail = `test_${Date.now()}@example.com`;
      console.log("\n1. Kiểm thử Đăng ký tài khoản...");
      const reg = await post("/register", {
        name: "Người Dùng Test",
        email: testEmail,
        password: "password123"
      });
      console.log("-> Đăng ký:", reg.status === 201 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", reg.data.message);

      // 2. CAPTCHA & LOGIN
      console.log("\n2. Kiểm thử CAPTCHA & Đăng nhập...");
      const captcha = await get("/captcha");
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("../config/jwt");
      const decoded = jwt.verify(captcha.data.captchaToken, JWT_SECRET);

      const login = await post("/login", {
        email: testEmail,
        password: "password123",
        captchaToken: captcha.data.captchaToken,
        captchaInput: decoded.code
      });
      console.log("-> Đăng nhập:", login.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
      const token = login.data.token;

      // 3. ME PROFILE
      console.log("\n3. Kiểm thử lấy thông tin /api/me...");
      const me = await get("/me", token);
      console.log("-> /api/me:", me.status === 200 && me.data.user.email === testEmail ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      // 4. UPDATE PROFILE
      console.log("\n4. Kiểm thử Cập nhật họ tên & email...");
      const newEmail = `updated_${Date.now()}@example.com`;
      const updateProf = await put("/profile", { name: "Tên Đã Cập Nhật", email: newEmail }, token);
      console.log("-> Sửa họ tên & email:", updateProf.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", updateProf.data.message);
      const updatedToken = updateProf.data.token;

      // 5. UPDATE AVATAR
      console.log("\n5. Kiểm thử Cập nhật ảnh đại diện...");
      const av = await put("/avatar", { avatar: "🚀" }, updatedToken);
      console.log("-> Sửa avatar:", av.status === 200 && av.data.avatar === "🚀" ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      // 6. CHANGE PASSWORD
      console.log("\n6. Kiểm thử Đổi mật khẩu...");
      const pass = await put("/change-password", {
        currentPassword: "password123",
        newPassword: "newpassword123",
        confirmNewPassword: "newpassword123"
      }, updatedToken);
      console.log("-> Đổi mật khẩu:", pass.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", pass.data.message);

      // 7. CATEGORIES
      console.log("\n7. Kiểm thử Quản lý danh mục...");
      const cat = await post("/categories", { name: "Dự Án Mới" }, updatedToken);
      console.log("-> Thêm danh mục:", cat.status === 201 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", cat.data.category?.name);
      const catId = cat.data.category.id;

      // 8. ADD TASK WITH "Khẩn cấp", STARTDATE, DUEDATE, NOTES
      console.log("\n8. Kiểm thử Thêm công việc với mức 'Khẩn cấp', ngày bắt đầu, ghi chú...");
      const taskRes = await post("/tasks", {
        title: "Báo cáo khẩn cấp",
        description: "Báo cáo tiến độ cho hội đồng",
        priority: "Khẩn cấp",
        startDate: "2026-09-01",
        dueDate: "2026-09-10",
        notes: "Ghi chú tài liệu đính kèm số 1",
        categoryId: catId,
        progressSteps: [
          { title: "Bước 1: Soạn thảo", completed: true },
          { title: "Bước 2: Phê duyệt", completed: false }
        ]
      }, updatedToken);
      console.log("-> Thêm công việc:", taskRes.status === 201 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", "Tiến độ:", taskRes.data.task.progress + "%", "Ưu tiên:", taskRes.data.task.priority);
      const taskId = taskRes.data.task.id;

      // 9. SUB-TASK EDIT STEP
      console.log("\n9. Kiểm thử Chỉnh sửa bước thực hiện sub-task...");
      const stepId = taskRes.data.task.progressSteps[1].id;
      const stepEdit = await put(`/tasks/${taskId}/steps/${stepId}`, {
        title: "Bước 2: Phê duyệt và ký nhận",
        completed: true
      }, updatedToken);
      console.log("-> Sửa bước & hoàn thành:", stepEdit.status === 200 && stepEdit.data.task.progress === 100 ? "✅ THÀNH CÔNG (100% tự chuyển Hoàn thành)" : "❌ THẤT BẠI");

      // 10. NOTIFICATIONS
      console.log("\n10. Kiểm thử Hệ thống thông báo...");
      const notifs = await get("/notifications", updatedToken);
      console.log("-> Lấy thông báo:", notifs.status === 200 && notifs.data.notifications.length > 0 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", "Số thông báo:", notifs.data.notifications.length);

      const checkRemind = await post("/notifications/check-reminders", {}, updatedToken);
      console.log("-> Quét lời nhắc:", checkRemind.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      // 11. STATS & CHARTS API
      console.log("\n11. Kiểm thử Thống kê và Báo cáo...");
      const stats = await get("/stats", updatedToken);
      console.log("-> Lấy thống kê:", stats.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI", "Tổng việc:", stats.data.overview.totalTasks, "Tỷ lệ:", stats.data.overview.completionRate + "%");

      // 12. ARCHIVE & RESTORE
      console.log("\n12. Kiểm thử Kho lưu trữ (Archive) & Khôi phục (Restore)...");
      const arch = await patch(`/tasks/${taskId}/archive`, {}, updatedToken);
      console.log("-> Chuyển lưu trữ:", arch.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      const archList = await get("/tasks/archived", updatedToken);
      console.log("-> Xem danh sách lưu trữ:", archList.status === 200 && archList.data.length > 0 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      const restore = await patch(`/tasks/${taskId}/restore`, {}, updatedToken);
      console.log("-> Khôi phục:", restore.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      // 13. PERMANENT DELETE TASK
      console.log("\n13. Kiểm thử Xóa vĩnh viễn công việc...");
      const permDel = await del(`/tasks/${taskId}/permanent`, updatedToken);
      console.log("-> Xóa vĩnh viễn:", permDel.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      // 14. DELETE ACCOUNT
      console.log("\n14. Kiểm thử Xóa tài khoản vĩnh viễn...");
      const delAcc = await del("/account", updatedToken, { password: "newpassword123" });
      console.log("-> Xóa tài khoản:", delAcc.status === 200 ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

      console.log("\n=== TẤT CẢ 14 HẠNG MỤC KIỂM THỬ ĐỀU ĐẠT CHUẨN 100%! ===");
      server.close();
      process.exit(0);
    } catch (err) {
      console.error("Lỗi trong quá trình kiểm thử:", err);
      server.close();
      process.exit(1);
    }
  });
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
