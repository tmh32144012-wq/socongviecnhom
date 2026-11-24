const bcrypt = require("bcrypt");
const {
  User,
  Category,
  Board,
  BoardMember,
  BoardColumn,
  Task,
  TaskAssignee,
  TaskComment,
  TaskProgressStep,
} = require("../models");

function formatDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function ensureUser(name, email, password) {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email,
      passwordHash,
      createdAt: new Date(),
    });
  }

  const defaultCategories = [
    { name: "Công việc", color: "#0f766e" },
    { name: "Thiết kế UI", color: "#b45309" },
    { name: "Lập trình", color: "#1d4ed8" },
    { name: "Kiểm thử", color: "#c2410c" },
  ];

  for (const cat of defaultCategories) {
    const existing = await Category.findOne({ where: { userId: user.id, name: cat.name } });
    if (!existing) {
      await Category.create({ userId: user.id, name: cat.name, color: cat.color });
    }
  }

  return user;
}

async function initializeDatabase() {
  try {
    // 1. Khởi tạo 3 tài khoản mẫu để dễ dàng demo làm việc nhóm & realtime
    const userHy = await ensureUser("Trần Minh Hy", "user@example.com", "123456");
    const userLan = await ensureUser("Nguyễn Ngọc Lan", "lan@example.com", "123456");
    const userKhoa = await ensureUser("Lê Đăng Khoa", "khoa@example.com", "123456");

    // 2. Tạo Board nhóm mẫu nếu chưa có Board nào (hoặc Board mẫu chưa có task do lần khởi tạo trước)
    const { Op } = require("../models");
    const boardTaskCount = await Task.count({ where: { boardId: { [Op.ne]: null } } });
    if (boardTaskCount === 0) {
      // Dọn dẹp board trống nếu lần khởi tạo trước bị ngắt giữa chừng
      const existingBoards = await Board.findAll();
      for (const eb of existingBoards) {
        await BoardColumn.destroy({ where: { boardId: eb.id } });
        await BoardMember.destroy({ where: { boardId: eb.id } });
        await eb.destroy();
      }
      const categories = await Category.findAll({ where: { userId: userHy.id } });
      const devCat = categories.find((c) => c.name === "Lập trình") || categories[0];
      const designCat = categories.find((c) => c.name === "Thiết kế UI") || categories[0];
      const qaCat = categories.find((c) => c.name === "Kiểm thử") || categories[0];
      const workCat = categories.find((c) => c.name === "Công việc") || categories[0];

      // Board 1: Dự án Website Quản lý Công việc Nhóm
      const board1 = await Board.create({
        name: "Phát triển Hệ thống Kanban Nhóm",
        description: "Không gian làm việc chính của nhóm phát triển: theo dõi tiến độ Backend Node.js, giao diện React và kiểm thử SQL Server.",
        coverColor: "#0f766e",
        ownerId: userHy.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await BoardMember.bulkCreate([
        { boardId: board1.id, userId: userHy.id, role: "owner", status: "accepted", joinedAt: new Date() },
        { boardId: board1.id, userId: userLan.id, role: "admin", status: "accepted", invitedBy: userHy.id, joinedAt: new Date() },
        { boardId: board1.id, userId: userKhoa.id, role: "member", status: "accepted", invitedBy: userHy.id, joinedAt: new Date() },
      ]);

      const colTodo = await BoardColumn.create({
        boardId: board1.id,
        title: "To Do",
        position: 0,
        color: "#64748b",
        isDone: false,
      });
      const colDoing = await BoardColumn.create({
        boardId: board1.id,
        title: "Doing",
        position: 1,
        color: "#0284c7",
        isDone: false,
      });
      const colReview = await BoardColumn.create({
        boardId: board1.id,
        title: "Review",
        position: 2,
        color: "#b45309",
        isDone: false,
      });
      const colDone = await BoardColumn.create({
        boardId: board1.id,
        title: "Done",
        position: 3,
        color: "#15803d",
        isDone: true,
      });

      // Task 1 (To Do)
      const t1 = await Task.create({
        userId: userHy.id,
        boardId: board1.id,
        columnId: colTodo.id,
        position: 0,
        title: "Viết tài liệu đặc tả API và hướng dẫn triển khai Windows",
        description: "Tổng hợp danh sách endpoint RESTful, sự kiện Socket.io và cách chạy nhanh bằng file start.bat trên máy Windows.",
        priority: "Trung bình",
        status: "Chưa bắt đầu",
        startDate: formatDateOffset(0),
        dueDate: formatDateOffset(5),
        progress: 0,
        categoryId: workCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.bulkCreate([
        { taskId: t1.id, userId: userLan.id },
        { taskId: t1.id, userId: userKhoa.id },
      ]);

      // Task 2 (To Do)
      const t2 = await Task.create({
        userId: userLan.id,
        boardId: board1.id,
        columnId: colTodo.id,
        position: 1,
        title: "Kiểm thử kéo thả thẻ đồng thời trên 2 trình duyệt",
        description: "Đảm bảo khi thành viên A kéo thẻ sang cột mới hoặc thêm bình luận, màn hình thành viên B cập nhật ngay lập tức qua Socket.io.",
        priority: "Cao",
        status: "Chưa bắt đầu",
        startDate: formatDateOffset(0),
        dueDate: formatDateOffset(2),
        progress: 0,
        categoryId: qaCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.create({ taskId: t2.id, userId: userKhoa.id });

      // Task 3 (Doing)
      const t3 = await Task.create({
        userId: userHy.id,
        boardId: board1.id,
        columnId: colDoing.id,
        position: 0,
        title: "Hoàn thiện bảng Kanban kéo thả & cột trạng thái động",
        description: "Hỗ trợ tạo cột mới, đổi tên cột, gán nhiều thành viên vào thẻ và hiển thị hạn chót trực quan.",
        priority: "Khẩn cấp",
        status: "Đang thực hiện",
        startDate: formatDateOffset(-2),
        dueDate: formatDateOffset(1),
        progress: 67,
        categoryId: devCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.bulkCreate([
        { taskId: t3.id, userId: userHy.id },
        { taskId: t3.id, userId: userLan.id },
      ]);
      await TaskProgressStep.bulkCreate([
        { taskId: t3.id, title: "Xây dựng API CRUD Board & BoardColumns", completed: true, stepOrder: 1 },
        { taskId: t3.id, title: "Tích hợp @dnd-kit kéo thả liên cột", completed: true, stepOrder: 2 },
        { taskId: t3.id, title: "Hoàn thiện bộ lọc theo thành viên & bình luận realtime", completed: false, stepOrder: 3 },
      ]);
      await TaskComment.bulkCreate([
        {
          taskId: t3.id,
          userId: userLan.id,
          content: "Mình đã kiểm tra phần tạo cột mới và đổi tên cột, chạy rất mượt. Nhờ Hy xem thêm phần đồng bộ thứ tự thẻ nhé.",
          createdAt: new Date(Date.now() - 3600 * 1000 * 3),
          updatedAt: new Date(Date.now() - 3600 * 1000 * 3),
        },
        {
          taskId: t3.id,
          userId: userHy.id,
          content: "Ok Lan, mình đã bổ sung API PATCH /tasks/:id/move để lưu chính xác vị trí thẻ trong từng cột rồi!",
          createdAt: new Date(Date.now() - 3600 * 1000),
          updatedAt: new Date(Date.now() - 3600 * 1000),
        },
      ]);

      // Task 4 (Review)
      const t4 = await Task.create({
        userId: userLan.id,
        boardId: board1.id,
        columnId: colReview.id,
        position: 0,
        title: "Tinh chỉnh giao diện phong cách tối giản, gần gũi",
        description: "Loại bỏ màu gradient tím chói, chuyển sang tông giấy ấm kết hợp xanh rêu trầm dễ đọc khi làm việc lâu.",
        priority: "Cao",
        status: "Đang thực hiện",
        startDate: formatDateOffset(-3),
        dueDate: formatDateOffset(0),
        progress: 85,
        categoryId: designCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.bulkCreate([
        { taskId: t4.id, userId: userLan.id },
        { taskId: t4.id, userId: userHy.id },
      ]);
      await TaskComment.create({
        taskId: t4.id,
        userId: userKhoa.id,
        content: "Màu nền ấm nhìn dịu mắt hơn hẳn bản cũ, avatar thành viên trên thẻ cũng rất rõ ràng.",
        createdAt: new Date(Date.now() - 1800 * 1000),
        updatedAt: new Date(Date.now() - 1800 * 1000),
      });

      // Task 5 (Done)
      const t5 = await Task.create({
        userId: userHy.id,
        boardId: board1.id,
        columnId: colDone.id,
        position: 0,
        title: "Thiết kế cơ sở dữ liệu SQL Server & xác thực JWT",
        description: "Khởi tạo các bảng Users, Boards, BoardMembers, BoardColumns, Tasks, TaskAssignees, TaskComments và cơ chế đăng nhập JWT.",
        priority: "Cao",
        status: "Hoàn thành",
        startDate: formatDateOffset(-6),
        dueDate: formatDateOffset(-1),
        progress: 100,
        categoryId: devCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.bulkCreate([
        { taskId: t5.id, userId: userHy.id },
        { taskId: t5.id, userId: userKhoa.id },
      ]);

      // Board 2: Kế hoạch Học tập & Bảo vệ Đồ án
      const board2 = await Board.create({
        name: "Kế hoạch Báo cáo & Bảo vệ Đồ án",
        description: "Chuẩn bị slide thuyết trình, kịch bản demo sản phẩm và phân công trả lời câu hỏi hội đồng.",
        coverColor: "#b45309",
        ownerId: userHy.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await BoardMember.bulkCreate([
        { boardId: board2.id, userId: userHy.id, role: "owner", status: "accepted", joinedAt: new Date() },
        { boardId: board2.id, userId: userLan.id, role: "member", status: "accepted", invitedBy: userHy.id, joinedAt: new Date() },
      ]);

      const b2Todo = await BoardColumn.create({ boardId: board2.id, title: "To Do", position: 0, color: "#64748b", isDone: false });
      const b2Doing = await BoardColumn.create({ boardId: board2.id, title: "Doing", position: 1, color: "#0284c7", isDone: false });
      const b2Done = await BoardColumn.create({ boardId: board2.id, title: "Done", position: 2, color: "#15803d", isDone: true });

      const b2t1 = await Task.create({
        userId: userHy.id,
        boardId: board2.id,
        columnId: b2Doing.id,
        position: 0,
        title: "Soạn kịch bản demo 2 tài khoản thao tác realtime",
        description: "Chuẩn bị sẵn trình duyệt thường (Minh Hy) và cửa sổ ẩn danh (Ngọc Lan) để trình diễn kéo thả và bình luận trực tiếp.",
        priority: "Cao",
        status: "Đang thực hiện",
        startDate: formatDateOffset(0),
        dueDate: formatDateOffset(3),
        progress: 50,
        categoryId: workCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.bulkCreate([
        { taskId: b2t1.id, userId: userHy.id },
        { taskId: b2t1.id, userId: userLan.id },
      ]);

      const b2t2 = await Task.create({
        userId: userLan.id,
        boardId: board2.id,
        columnId: b2Todo.id,
        position: 0,
        title: "Chụp ảnh minh họa giao diện cho báo cáo Word",
        description: "Chụp đủ các màn hình: Đăng nhập, Không gian làm việc, Bảng Kanban, Chi tiết thẻ có bình luận & gán thành viên.",
        priority: "Trung bình",
        status: "Chưa bắt đầu",
        startDate: formatDateOffset(1),
        dueDate: formatDateOffset(6),
        progress: 0,
        categoryId: designCat?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await TaskAssignee.create({ taskId: b2t2.id, userId: userLan.id });

      console.log("✅ Đã khởi tạo 3 tài khoản mẫu và 2 không gian làm việc nhóm Kanban.");
    }

    console.log("✅ Khởi tạo database hoàn tất.");
  } catch (error) {
    console.error("❌ Lỗi khởi tạo database:", error);
  }
}

module.exports = {
  initializeDatabase,
};
