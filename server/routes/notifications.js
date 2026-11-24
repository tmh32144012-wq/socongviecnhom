const express = require("express");
const { Notification, Task, TaskAssignee, Op } = require("../models");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// 1. GET ALL NOTIFICATIONS (Hỗ trợ phân trang page & limit, vẫn tương thích ngược)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit || "100", 10)));
    const offset = (page - 1) * limit;

    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thông báo:", error);
    res.status(500).json({ message: "Không thể lấy thông báo!" });
  }
});

// 2. MARK SINGLE NOTIFICATION AS READ
router.patch("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo!" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Đã đánh dấu đã đọc!", notification });
  } catch (error) {
    console.error("Lỗi đánh dấu đã đọc:", error);
    res.status(500).json({ message: "Không thể cập nhật thông báo!" });
  }
});

// 3. MARK ALL AS READ
router.post("/read-all", async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc!" });
  } catch (error) {
    console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    res.status(500).json({ message: "Không thể cập nhật thông báo!" });
  }
});

// 4. DELETE SINGLE NOTIFICATION
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo!" });
    }

    await notification.destroy();
    res.json({ message: "Đã xóa thông báo!", id });
  } catch (error) {
    console.error("Lỗi xóa thông báo:", error);
    res.status(500).json({ message: "Không thể xóa thông báo!" });
  }
});

// 5. CLEAR ALL NOTIFICATIONS
router.delete("/clear/all", async (req, res) => {
  try {
    await Notification.destroy({ where: { userId: req.user.id } });
    res.json({ message: "Đã xóa tất cả thông báo!" });
  } catch (error) {
    console.error("Lỗi xóa tất cả thông báo:", error);
    res.status(500).json({ message: "Không thể xóa thông báo!" });
  }
});

// 6. SCAN AND CREATE REMINDERS (cả việc cá nhân lẫn việc nhóm được gán)
router.post("/check-reminders", async (req, res) => {
  try {
    const assignedRows = await TaskAssignee.findAll({
      where: { userId: req.user.id },
      attributes: ["taskId"],
    });
    const assignedTaskIds = assignedRows.map((a) => a.taskId);

    const taskWhere = assignedTaskIds.length > 0
      ? {
          isArchived: false,
          [Op.or]: [
            { userId: req.user.id },
            { id: { [Op.in]: assignedTaskIds } },
          ],
        }
      : { userId: req.user.id, isArchived: false };

    const tasks = await Task.findAll({ where: taskWhere });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    let createdCount = 0;

    for (const task of tasks) {
      if (task.status === "Hoàn thành" || !task.dueDate) continue;

      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today) {
        const existing = await Notification.findOne({
          where: {
            userId: req.user.id,
            taskId: task.id,
            type: "overdue",
            [Op.or]: [
              { isRead: false },
              { createdAt: { [Op.gte]: today } },
            ],
          },
        });

        if (!existing) {
          await Notification.create({
            userId: req.user.id,
            taskId: task.id,
            title: "Công việc đã quá hạn",
            message: `Công việc "${task.title}" đã quá hạn vào ngày ${task.dueDate}. Hãy hoàn thành sớm!`,
            type: "overdue",
            isRead: false,
            createdAt: new Date(),
          });
          createdCount++;
        }
      } else if (due <= dayAfterTomorrow) {
        const isToday = due.getTime() === today.getTime();
        const existing = await Notification.findOne({
          where: {
            userId: req.user.id,
            taskId: task.id,
            type: "deadline",
            [Op.or]: [
              { isRead: false },
              { createdAt: { [Op.gte]: today } },
            ],
          },
        });

        if (!existing) {
          await Notification.create({
            userId: req.user.id,
            taskId: task.id,
            title: isToday ? "Hạn chót hôm nay!" : "Sắp đến hạn hoàn thành",
            message: isToday
              ? `Công việc "${task.title}" có hạn hoàn thành vào hôm nay (${task.dueDate})!`
              : `Công việc "${task.title}" sắp đến hạn vào ngày ${task.dueDate}.`,
            type: "deadline",
            isRead: false,
            createdAt: new Date(),
          });
          createdCount++;
        }
      }
    }

    res.json({
      message: `Đã kiểm tra lời nhắc và tạo ${createdCount} thông báo mới.`,
      createdCount,
    });
  } catch (error) {
    console.error("Lỗi kiểm tra nhắc việc:", error);
    res.status(500).json({ message: "Không thể kiểm tra nhắc việc!" });
  }
});

module.exports = router;
