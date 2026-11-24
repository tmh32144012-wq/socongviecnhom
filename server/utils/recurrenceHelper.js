/**
 * Helper tính ngày hạn chót chu kỳ tiếp theo cho công việc lặp lại (daily / weekly / monthly)
 */
function calculateNextDate(dateStr, recurrence) {
  if (!recurrence || recurrence === "none") return null;
  const base = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const next = new Date(base.getTime());
  if (recurrence === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    return null;
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Khi 1 công việc lặp lại hoàn thành -> tự động sinh bản sao cho chu kỳ kế tiếp
 */
async function spawnNextRecurringTaskIfNeeded(task, actorId) {
  if (!task || !task.recurrence || task.recurrence === "none") return null;

  const { Task, BoardColumn, TaskAssignee, TaskLabel } = require("../models");
  const nextDue = calculateNextDate(task.dueDate, task.recurrence);
  const nextStart = task.startDate ? calculateNextDate(task.startDate, task.recurrence) : null;

  let firstColumnId = null;
  if (task.boardId) {
    const firstCol = await BoardColumn.findOne({
      where: { boardId: task.boardId, isDone: false },
      order: [["position", "ASC"]],
    });
    firstColumnId = firstCol ? firstCol.id : task.columnId;
  }

  const newTask = await Task.create({
    userId: task.userId,
    boardId: task.boardId,
    columnId: firstColumnId,
    position: 0,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: "Chưa bắt đầu",
    startDate: nextStart,
    dueDate: nextDue,
    progress: 0,
    notes: task.notes,
    isArchived: false,
    categoryId: task.categoryId,
    recurrence: task.recurrence,
    lastModifiedById: actorId || task.userId,
    lastModifiedByName: "Hệ thống (Lặp định kỳ)",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Sao chép thành viên được gán & nhãn bảng sang chu kỳ mới
  const assignees = await TaskAssignee.findAll({ where: { taskId: task.id } });
  for (const a of assignees) {
    await TaskAssignee.create({ taskId: newTask.id, userId: a.userId, assignedAt: new Date() });
  }

  const labels = await TaskLabel.findAll({ where: { taskId: task.id } });
  for (const l of labels) {
    await TaskLabel.create({ taskId: newTask.id, labelId: l.labelId });
  }

  return newTask;
}

module.exports = {
  calculateNextDate,
  spawnNextRecurringTaskIfNeeded,
};
