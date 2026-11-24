const { Task, TaskAssignee, Notification, Op } = require("../models");
const { emitUserEvent } = require("../socket");

/**
 * Tiến trình chạy ngầm (Scheduled Job) tự động quét công việc sắp đến hạn / quá hạn
 * và gửi thông báo realtime cho người tạo + thành viên được gán
 */
async function scanAllDeadlineReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.findAll({
      where: {
        isArchived: false,
        status: { [Op.ne]: "Hoàn thành" },
        dueDate: { [Op.ne]: null },
      },
      attributes: ["id", "userId", "boardId", "title", "dueDate", "status", "progress"],
    });

    let createdCount = 0;

    for (const task of tasks) {
      if (task.progress >= 100) continue;

      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);

      let type = null;
      let title = "";
      let message = "";

      if (due < today) {
        type = "overdue";
        title = "Công việc đã quá hạn";
        message = `Công việc "${task.title}" đã quá hạn từ ngày ${task.dueDate}. Hãy ưu tiên xử lý ngay!`;
      } else if (due <= tomorrow) {
        type = "deadline";
        const isToday = due.getTime() === today.getTime();
        title = isToday ? "Hạn chót hôm nay!" : "Sắp đến hạn trong 24 giờ";
        message = `Công việc "${task.title}" sẽ đến hạn vào ${isToday ? "hôm nay" : `ngày mai (${task.dueDate})`}.`;
      } else {
        continue;
      }

      const assignees = await TaskAssignee.findAll({
        where: { taskId: task.id },
        attributes: ["userId"],
      });

      const recipientIds = new Set([task.userId, ...assignees.map((a) => a.userId)]);

      for (const uid of recipientIds) {
        const existing = await Notification.findOne({
          where: {
            userId: uid,
            taskId: task.id,
            type,
            createdAt: { [Op.gte]: today },
          },
        });

        if (!existing) {
          const notif = await Notification.create({
            userId: uid,
            taskId: task.id,
            title,
            message,
            type,
            isRead: false,
            createdAt: new Date(),
          });
          emitUserEvent(uid, "notification:new", { notification: notif.toJSON() });
          createdCount += 1;
        }
      }
    }

    if (createdCount > 0) {
      console.log(`⏰ [ReminderScheduler] Đã tạo và gửi ${createdCount} thông báo nhắc hạn tự động.`);
    }
    return createdCount;
  } catch (err) {
    console.warn("[ReminderScheduler Error]:", err.message);
    return 0;
  }
}

let schedulerTimer = null;

function startReminderScheduler(intervalMs = 30 * 60 * 1000) {
  if (schedulerTimer) return;
  // Quét lần đầu sau khi server ổn định 15 giây
  const initTimeout = setTimeout(() => {
    scanAllDeadlineReminders();
  }, 15000);
  if (initTimeout.unref) initTimeout.unref();

  schedulerTimer = setInterval(() => {
    scanAllDeadlineReminders();
  }, intervalMs);
  if (schedulerTimer.unref) schedulerTimer.unref();

  console.log("⏰ Đã kích hoạt trình quét nhắc hạn công việc tự động (mỗi 30 phút).");
}

module.exports = {
  scanAllDeadlineReminders,
  startReminderScheduler,
};
