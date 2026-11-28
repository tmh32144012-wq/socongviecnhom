# KANOFLOW — Hệ Thống Quản Lý Công Việc Nhóm Kiểu Kanban

> **Đề tài môn Chuyên đề Node.js & React.js:** Hệ thống Quản lý Công việc nhóm kiểu Kanban (Trello Clone mở rộng) chạy trực tiếp trên Windows với **Node.js + Express 5 + React 19 + Socket.io Realtime + Microsoft SQL Server**.

---

## 1. Tính năng nổi bật

### Yêu cầu cốt lõi (100%)
- **Đăng ký / Đăng nhập bảo mật (JWT):** Mã hóa mật khẩu `bcrypt`, thu hồi phiên từ xa (`tokenVersion`), CAPTCHA dùng 1 lần chống Replay Attack, Rate Limiting, Quên mật khẩu OTP 3 bước (hỗ trợ **SMTP Nodemailer** thật hoặc tự động fallback chế độ local), xóa tài khoản an toàn.
- **Không gian làm việc nhóm (Boards):** Tạo / sửa / xóa Board, chọn màu bìa, mời thành viên qua email (kèm gửi email thông báo nếu cấu hình SMTP), chấp nhận / từ chối lời mời, phân quyền `Owner / Admin / Member`.
- **Cột trạng thái Kanban động + Giới hạn WIP (WIP Limit):** Tự tạo 3 cột mặc định (`To Do`, `Doing`, `Done`), tùy chỉnh tên / màu / sắp xếp lại vị trí / đặt **Giới hạn WIP** để tự cảnh báo khi cột bị quá tải.
- **Kéo thả thẻ (Drag & Drop) & Đồng bộ Realtime:** Kéo thả mượt bằng `@dnd-kit`, tự cập nhật trạng thái/tiến độ và đồng bộ tức thời cho toàn bộ thành viên đang mở bảng qua **Socket.io**.
- **Gán nhiều thành viên, Hạn chót (Deadline) & Nhắc việc tự động:** Gán nhiều người phụ trách trên 1 thẻ, đặt ngày bắt đầu/hạn chót, trình quét tự động gửi thông báo sắp đến hạn / quá hạn mỗi 30 phút.
- **Bình luận thẻ & Phòng Chat nhóm dự án:** Hỗ trợ `@mention` thành viên và gọi **`@troliao`** để Trợ lý ảo phân tích ngữ cảnh thực tế của công việc / dự án rồi trả lời công khai cho **mọi thành viên cùng thấy realtime**.

### Tính năng nâng cao & Cộng tác
- **Bộ lọc Kanban nâng cao:** Lọc nhanh theo từ khóa, thành viên phụ trách, mức ưu tiên, nhãn dùng chung (Board Labels), nút *Việc của tôi* và *Quá hạn*.
- **Trợ lý ảo AI cá nhân (lưu 3 đoạn chat gần nhất theo từng tài khoản):** Tách biệt hoàn toàn giữa các tài khoản (`AiChatSessions`), hỗ trợ Google Gemini / OpenAI API Key hoặc chạy bộ phân tích nội bộ tiếng Việt.
- **Tệp đính kèm có xem trước trực tiếp (Image & PDF Lightbox):** Kiểm tra whitelist định dạng an toàn, xem trước trực tiếp ảnh/PDF không cần tải về.
- **Thống kê & Tải công việc nhóm (Team Workload):** Biểu đồ Chart.js (Trạng thái, Danh mục, 30 ngày gần nhất, Mức ưu tiên), bảng phân tích khối lượng công việc từng thành viên (*Quá tải / Đang bận / Cân bằng*) và xuất báo cáo CSV / PDF.
- **Checklist bước thực hiện con, Công việc lặp lại, Nhật ký hoạt động (Activity Log), Kho lưu trữ, Lịch (Calendar), Ngày của tôi (My Day).**
- **4 chủ đề giao diện:** Sáng, Tối, Liquid Glass (trong suốt tùy chỉnh độ mờ) và Tết, hỗ trợ hình nền cá nhân.

---

## 2. Công nghệ sử dụng

| Tầng | Công nghệ |
| :--- | :--- |
| **Frontend** | React `19.2`, Vite `8.2`, `@dnd-kit`, `chart.js` + `react-chartjs-2`, `socket.io-client`, `lucide-react` |
| **Backend** | Node.js, Express `5.2`, Socket.io `4.8`, Sequelize `6.35`, `mssql`, `bcrypt`, `jsonwebtoken`, `multer`, `nodemailer` |
| **Cơ sở dữ liệu** | **Microsoft SQL Server (MSSQL)** — 17 bảng quan hệ, tự động migration an toàn (`runSafeMigrations`) |

### 17 bảng CSDL SQL Server (`TaskManager`)
1. `Users` · 2. `PasswordResets` · 3. `Categories` · 4. `Boards` · 5. `BoardMembers` · 6. `BoardColumns` · 7. `Tasks` · 8. `TaskAssignees` · 9. `TaskProgressSteps` · 10. `TaskComments` · 11. `BoardLabels` · 12. `TaskLabels` · 13. `BoardMessages` · 14. `ActivityLogs` · 15. `Notifications` · 16. `Attachments` · 17. `AiChatSessions`

---

## 3. Hướng dẫn cài đặt & chạy nhanh trên Windows

### Bước 1: Yêu cầu môi trường
- **Node.js** >= 18 (khuyến nghị Node.js 20/22 LTS)
- **Microsoft SQL Server** (Express / Developer) đang chạy trên `localhost:1433` (bật TCP/IP trong SQL Server Configuration Manager và bật chế độ *SQL Server and Windows Authentication mode*)

### Bước 2: Tạo Database trống trên SQL Server (SSMS)
Mở **SQL Server Management Studio (SSMS)** và chạy lệnh:
```sql
CREATE DATABASE TaskManager;
```
> Toàn bộ 17 bảng, khóa ngoại, migration nâng cấp và tài khoản demo sẽ được hệ thống **tự động khởi tạo** ngay lần đầu chạy backend!

### Bước 3: Cấu hình file môi trường `server/.env`
Copy file `server/.env.example` thành `server/.env` và điền thông tin kết nối SQL Server của máy bạn:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=1433
DB_NAME=TaskManager
DB_USER=sa
DB_PASSWORD=your_sql_server_password
JWT_SECRET=your_random_secret_key
```
*(Tùy chọn)* Bạn có thể điền thêm:
- `AI_API_KEY` (Google Gemini / OpenAI) cho Trợ lý ảo Cloud.
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (Gmail App Password) để gửi email OTP & lời mời thật.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Redirect URI: `http://localhost:5000/api/auth/google/callback`) và `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` (Redirect URI: `http://localhost:5000/api/auth/facebook/callback`) để kích hoạt đăng nhập thật bằng Google & Facebook.

### Bước 4: Khởi chạy 1-click trên Windows
Nhấp đúp vào file **`start.bat`** tại thư mục gốc dự án!
File `start.bat` sẽ tự động:
1. Kiểm tra Node.js và sự tồn tại của `server/.env`.
2. Tự cài đặt các gói `node_modules` (nếu chưa có).
3. Khởi động đồng thời **Backend (`http://localhost:5000`)** và **Frontend (`http://localhost:5173`)**.
4. Tự động mở trình duyệt tại `http://localhost:5173`.

Hoặc chạy thủ công qua terminal:
```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

---

## 4. Kiểm thử & Tài khoản mẫu
- Tài khoản quản trị mặc định được tạo sẵn khi DB trống: `user@example.com` / `123456` *(nên tạo thêm 1–2 tài khoản mới để demo kéo thả Kanban realtime & `@troliao` trên 2 cửa sổ trình duyệt song song)*.
- Chạy kiểm thử đơn vị backend: `npm test --prefix server`
- Kiểm tra lint & build frontend: `npm run lint --prefix client && npm run build --prefix client`
