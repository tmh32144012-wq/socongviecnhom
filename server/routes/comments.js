const express = require("express");
const {
  Task,
  TaskComment,
  TaskAssignee,
  Notification,
  User,
  Op,
} = require("../models");
const authenticateToken = require("../middleware/auth");
const { canAccessTask, isBoardAdmin } = require("../utils/boardAccess");
const { emitBoardEvent, emitUserEvent } = require("../socket");
const { logActivity } = require("../utils/activityLogger");
const { findMentionedBoardMembers } = require("./collaboration");

const router = express.Router();
router.use(authenticateToken);

async function hydrateComment(comment) {
  const author = await User.findByPk(comment.userId, {
    attributes: ["id", "name", "email", "avatar"],
  });
  return {
    ...comment.toJSON(),
    author: author ? author.toJSON() : null,
  };
}

// ==================================================
// 1. GET /api/tasks/:taskId/comments — Lấy danh sách bình luận của thẻ
// ==================================================
router.get("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền xem bình luận của công việc này!" });
    }

    const comments = await TaskComment.findAll({
      where: { taskId },
      order: [["createdAt", "ASC"]],
    });

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = userIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "name", "email", "avatar"],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

    const result = comments.map((c) => ({
      ...c.toJSON(),
      author: userMap.get(c.userId) || null,
    }));

    res.json({ comments: result });
  } catch (error) {
    console.error("Lỗi lấy bình luận:", error);
    res.status(500).json({ message: "Không thể tải bình luận!" });
  }
});

// ==================================================
// 2. POST /api/tasks/:taskId/comments — Thêm bình luận mới
// ==================================================
router.post("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống!" });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền bình luận trên công việc này!" });
    }

    const comment = await TaskComment.create({
      taskId,
      userId: req.user.id,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hydrated = await hydrateComment(comment);

    // Tạo thông báo cho người tạo task và các thành viên được gán (trừ người vừa bình luận)
    const assignees = await TaskAssignee.findAll({ where: { taskId }, attributes: ["userId"] });
    const recipientIds = new Set([
      task.userId,
      ...assignees.map((a) => a.userId),
    ]);
    recipientIds.delete(req.user.id);

    const preview = content.trim().length > 80
      ? content.trim().slice(0, 80) + "..."
      : content.trim();

    // Nhận diện @mention thành viên trong bảng để gửi thông báo ưu tiên
    const mentionedUsers = task.boardId
      ? await findMentionedBoardMembers(task.boardId, content.trim(), req.user.id)
      : [];
    const mentionedIds = new Set(mentionedUsers.map((u) => u.id));

    for (const u of mentionedUsers) {
      recipientIds.delete(u.id);
      const notif = await Notification.create({
        userId: u.id,
        taskId: task.id,
        title: `${hydrated.author?.name || "Thành viên"} đã nhắc đến bạn (@mention) trong "${task.title}"`,
        message: `"${preview}"`,
        type: "mention",
        isRead: false,
        createdAt: new Date(),
      });
      emitUserEvent(u.id, "notification:new", { notification: notif.toJSON() });
    }

    for (const recipientId of recipientIds) {
      const notif = await Notification.create({
        userId: recipientId,
        taskId: task.id,
        title: `Bình luận mới trong "${task.title}"`,
        message: `${hydrated.author?.name || "Thành viên"}: "${preview}"`,
        type: "comment",
        isRead: false,
        createdAt: new Date(),
      });
      emitUserEvent(recipientId, "notification:new", { notification: notif.toJSON() });
    }

    await logActivity({
      boardId: task.boardId,
      taskId: task.id,
      userId: req.user.id,
      action: mentionedIds.size > 0 ? "comment:mention" : "comment:created",
      summary: `${hydrated.author?.name || req.user.name} đã bình luận trên "${task.title}": "${preview}"`,
    });

    if (task.boardId) {
      emitBoardEvent(task.boardId, "comment:created", {
        boardId: task.boardId,
        taskId,
        comment: hydrated,
      });
    }

    res.status(201).json({
      message: "Đã đăng bình luận!",
      comment: hydrated,
    });
  } catch (error) {
    console.error("Lỗi tạo bình luận:", error);
    res.status(500).json({ message: "Không thể đăng bình luận!" });
  }
});

// ==================================================
// 3. PUT /api/comments/:id — Sửa bình luận của chính mình
// ==================================================
router.put("/comments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống!" });
    }

    const comment = await TaskComment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận!" });
    }

    if (Number(comment.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Bạn chỉ có thể chỉnh sửa bình luận của chính mình!" });
    }

    comment.content = content.trim();
    comment.updatedAt = new Date();
    await comment.save();

    const hydrated = await hydrateComment(comment);
    const task = await Task.findByPk(comment.taskId);
    if (task?.boardId) {
      emitBoardEvent(task.boardId, "comment:updated", {
        boardId: task.boardId,
        taskId: task.id,
        comment: hydrated,
      });
    }

    res.json({ message: "Đã cập nhật bình luận!", comment: hydrated });
  } catch (error) {
    console.error("Lỗi sửa bình luận:", error);
    res.status(500).json({ message: "Không thể cập nhật bình luận!" });
  }
});

// ==================================================
// 4. DELETE /api/comments/:id — Xóa bình luận (chính chủ hoặc Admin bảng)
// ==================================================
router.delete("/comments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const comment = await TaskComment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận!" });
    }

    const task = await Task.findByPk(comment.taskId);
    const isAuthor = Number(comment.userId) === Number(req.user.id);
    const isAdmin = task?.boardId ? await isBoardAdmin(task.boardId, req.user.id) : false;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này!" });
    }

    const taskId = comment.taskId;
    await comment.destroy();

    if (task?.boardId) {
      emitBoardEvent(task.boardId, "comment:deleted", {
        boardId: task.boardId,
        taskId,
        commentId: id,
      });
    }

    res.json({ message: "Đã xóa bình luận!", id });
  } catch (error) {
    console.error("Lỗi xóa bình luận:", error);
    res.status(500).json({ message: "Không thể xóa bình luận!" });
  }
});

module.exports = router;
