const { ActivityLog, User } = require("../models");
const { emitBoardEvent } = require("../socket");

/**
 * Ghi Nhật ký hoạt động (Audit Trail) cho Bảng / Công việc và phát realtime qua Socket.io
 */
async function logActivity({
  boardId = null,
  taskId = null,
  userId,
  action,
  summary,
  metadata = null,
}) {
  if (!userId || !action || !summary) return null;

  try {
    const entry = await ActivityLog.create({
      boardId: boardId ? Number(boardId) : null,
      taskId: taskId ? Number(taskId) : null,
      userId: Number(userId),
      action,
      summary,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    });

    const actor = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "avatar"],
    });

    const hydrated = {
      ...entry.toJSON(),
      actor: actor ? actor.toJSON() : null,
    };

    if (boardId) {
      emitBoardEvent(boardId, "activity:new", {
        boardId: Number(boardId),
        taskId: taskId ? Number(taskId) : null,
        activity: hydrated,
      });
    }

    return hydrated;
  } catch (err) {
    console.warn("[ActivityLog Warning]:", err.message);
    return null;
  }
}

module.exports = { logActivity };
