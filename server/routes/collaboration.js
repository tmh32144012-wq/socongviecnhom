const express = require("express");
const {
  ActivityLog,
  Board,
  BoardColumn,
  BoardLabel,
  TaskLabel,
  BoardMessage,
  BoardMember,
  Task,
  User,
  Notification,
  Op,
} = require("../models");
const authenticateToken = require("../middleware/auth");
const { canAccessBoard, canAccessTask, isBoardAdmin } = require("../utils/boardAccess");
const { emitBoardEvent, emitUserEvent } = require("../socket");
const { logActivity } = require("../utils/activityLogger");
const { hydrateSingleTask } = require("../utils/taskHydrator");
const {
  AI_BOT_AUTHOR,
  hasAiMention,
  generateBoardAiReply,
} = require("../utils/aiAssistant");

const router = express.Router();
router.use(authenticateToken);

/**
 * Helper tìm danh sách thành viên được @mention trong nội dung
 */
async function findMentionedBoardMembers(boardId, content, excludeUserId) {
  if (!boardId || !content || !content.includes("@")) return [];
  const memberships = await BoardMember.findAll({
    where: { boardId: Number(boardId), status: "accepted" },
    attributes: ["userId"],
  });
  const memberIds = memberships.map((m) => m.userId).filter((id) => Number(id) !== Number(excludeUserId));
  if (memberIds.length === 0) return [];

  const users = await User.findAll({
    where: { id: { [Op.in]: memberIds } },
    attributes: ["id", "name", "email"],
  });

  const lower = content.toLowerCase();
  return users.filter((u) => {
    const nameLower = (u.name || "").toLowerCase();
    const emailLower = (u.email || "").toLowerCase();
    const shortName = nameLower.split(/\s+/).pop() || "";
    return (
      (nameLower && lower.includes(`@${nameLower}`)) ||
      (emailLower && lower.includes(`@${emailLower}`)) ||
      (shortName.length >= 2 && lower.includes(`@${shortName}`))
    );
  });
}

// ==================================================
// 1. NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS) — Có phân trang
// ==================================================
router.get("/boards/:boardId/activities", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền xem nhật ký bảng này!" });
    }

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || "30", 10)));
    const offset = (page - 1) * limit;

    const { rows, count } = await ActivityLog.findAndCountAll({
      where: { boardId },
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "name", "email", "avatar"] })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

    const activities = rows.map((r) => ({
      ...r.toJSON(),
      actor: userMap.get(r.userId) || null,
    }));

    res.json({
      activities,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit), hasMore: offset + rows.length < count },
    });
  } catch (error) {
    console.error("Lỗi tải nhật ký bảng:", error);
    res.status(500).json({ message: "Không thể tải nhật ký hoạt động!" });
  }
});

router.get("/tasks/:taskId/activities", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Không tìm thấy công việc!" });

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Bạn không có quyền xem lịch sử thẻ này!" });

    const rows = await ActivityLog.findAll({
      where: { taskId },
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit: 50,
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "name", "email", "avatar"] })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

    res.json({
      activities: rows.map((r) => ({ ...r.toJSON(), actor: userMap.get(r.userId) || null })),
    });
  } catch (error) {
    console.error("Lỗi tải lịch sử thẻ:", error);
    res.status(500).json({ message: "Không thể tải lịch sử công việc!" });
  }
});

// ==================================================
// 2. NHÃN DÙNG CHUNG CỦA BẢNG (BOARD LABELS)
// ==================================================
router.get("/boards/:boardId/labels", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Không có quyền truy cập bảng này!" });

    const labels = await BoardLabel.findAll({
      where: { boardId },
      order: [["id", "ASC"]],
    });
    res.json({ labels });
  } catch (error) {
    console.error("Lỗi lấy nhãn bảng:", error);
    res.status(500).json({ message: "Không thể tải nhãn của bảng!" });
  }
});

router.post("/boards/:boardId/labels", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Không có quyền tạo nhãn trong bảng này!" });

    const { name, color = "#0f766e" } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Tên nhãn không được để trống!" });
    }

    const label = await BoardLabel.create({
      boardId,
      name: String(name).trim().slice(0, 80),
      color: String(color || "#0f766e").trim(),
      createdAt: new Date(),
    });

    await logActivity({
      boardId,
      userId: req.user.id,
      action: "label:created",
      summary: `${req.user.name} đã tạo nhãn chung "${label.name}"`,
    });

    emitBoardEvent(boardId, "board:labels-updated", { boardId });
    res.status(201).json({ message: "Đã tạo nhãn bảng!", label });
  } catch (error) {
    console.error("Lỗi tạo nhãn bảng:", error);
    res.status(500).json({ message: "Không thể tạo nhãn!" });
  }
});

router.delete("/labels/:labelId", async (req, res) => {
  try {
    const labelId = Number(req.params.labelId);
    const label = await BoardLabel.findByPk(labelId);
    if (!label) return res.status(404).json({ message: "Không tìm thấy nhãn!" });

    const admin = await isBoardAdmin(label.boardId, req.user.id);
    if (!admin) {
      return res.status(403).json({ message: "Chỉ Chủ bảng hoặc Quản trị viên mới được xóa nhãn chung!" });
    }

    const boardId = label.boardId;
    await TaskLabel.destroy({ where: { labelId } });
    await label.destroy();

    emitBoardEvent(boardId, "board:labels-updated", { boardId });
    res.json({ message: "Đã xóa nhãn!" });
  } catch (error) {
    console.error("Lỗi xóa nhãn:", error);
    res.status(500).json({ message: "Không thể xóa nhãn!" });
  }
});

// Gắn / cập nhật danh sách nhãn cho 1 công việc
router.put("/tasks/:taskId/labels", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { labelIds = [] } = req.body;
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ message: "Không tìm thấy công việc!" });

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Không có quyền cập nhật nhãn công việc này!" });

    const cleanIds = [...new Set((Array.isArray(labelIds) ? labelIds : []).map(Number).filter(Number.isInteger))];

    let validIds = cleanIds;
    if (task.boardId && cleanIds.length > 0) {
      const validLabels = await BoardLabel.findAll({
        where: { boardId: task.boardId, id: { [Op.in]: cleanIds } },
        attributes: ["id"],
      });
      validIds = validLabels.map((l) => l.id);
    }

    await TaskLabel.destroy({ where: { taskId } });
    for (const labelId of validIds) {
      await TaskLabel.create({ taskId, labelId });
    }

    const hydrated = await hydrateSingleTask(taskId);

    if (task.boardId) {
      emitBoardEvent(task.boardId, "task:updated", { boardId: task.boardId, task: hydrated });
    }

    await logActivity({
      boardId: task.boardId,
      taskId,
      userId: req.user.id,
      action: "task:labels-updated",
      summary: `${req.user.name} đã cập nhật nhãn cho thẻ "${task.title}"`,
    });

    res.json({ message: "Đã cập nhật nhãn công việc!", task: hydrated });
  } catch (error) {
    console.error("Lỗi cập nhật nhãn công việc:", error);
    res.status(500).json({ message: "Không thể cập nhật nhãn công việc!" });
  }
});

// ==================================================
// 3. PHÒNG CHAT CHUNG CỦA BẢNG (BOARD CHAT + @MENTION)
// ==================================================
router.get("/boards/:boardId/messages", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Bạn không có quyền truy cập phòng chat bảng này!" });

    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit || "50", 10)));
    const rows = await BoardMessage.findAll({
      where: { boardId },
      order: [["createdAt", "DESC"]],
      limit,
    });

    const ordered = rows.reverse();
    const userIds = [...new Set(ordered.filter((m) => !m.isAi).map((m) => m.userId))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "name", "email", "avatar"] })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

    res.json({
      messages: ordered.map((m) => {
        const plain = m.toJSON();
        return {
          ...plain,
          isAi: Boolean(plain.isAi),
          author: plain.isAi ? AI_BOT_AUTHOR : userMap.get(m.userId) || null,
        };
      }),
    });
  } catch (error) {
    console.error("Lỗi tải tin nhắn bảng:", error);
    res.status(500).json({ message: "Không thể tải phòng chat nhóm!" });
  }
});

router.post("/boards/:boardId/messages", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) return res.status(403).json({ message: "Bạn không thuộc bảng này!" });

    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống!" });
    }

    const trimmedContent = String(content).trim().slice(0, 2000);
    const msg = await BoardMessage.create({
      boardId,
      userId: req.user.id,
      content: trimmedContent,
      isAi: false,
      createdAt: new Date(),
    });

    const author = await User.findByPk(req.user.id, { attributes: ["id", "name", "email", "avatar"] });
    const hydrated = { ...msg.toJSON(), isAi: false, author: author ? author.toJSON() : null };

    emitBoardEvent(boardId, "board:message-new", { boardId, message: hydrated });

    // Nếu có @mention thành viên trong phòng chat -> gửi thông báo riêng
    const mentioned = await findMentionedBoardMembers(boardId, msg.content, req.user.id);
    for (const target of mentioned) {
      const notif = await Notification.create({
        userId: target.id,
        taskId: null,
        title: `${req.user.name} đã nhắc đến bạn trong phòng chat nhóm`,
        message: msg.content.slice(0, 120),
        type: "mention",
        isRead: false,
        createdAt: new Date(),
      });
      emitUserEvent(target.id, "notification:new", { notification: notif.toJSON() });
    }

    // Nếu tin nhắn có gọi @troliao -> AI phân tích ngữ cảnh toàn bộ bảng dự án và trả lời chung cho mọi thành viên
    let hydratedAi = null;
    if (hasAiMention(trimmedContent)) {
      try {
        const [board, columns, tasks, memberships, recentRows] = await Promise.all([
          Board.findByPk(boardId),
          BoardColumn.findAll({ where: { boardId }, order: [["position", "ASC"], ["id", "ASC"]] }),
          Task.findAll({ where: { boardId, isArchived: false } }),
          BoardMember.findAll({ where: { boardId, status: "accepted" } }),
          BoardMessage.findAll({ where: { boardId }, order: [["createdAt", "DESC"]], limit: 8 }),
        ]);

        const memberIds = memberships.map((m) => m.userId);
        const memberUsers = memberIds.length
          ? await User.findAll({ where: { id: { [Op.in]: memberIds } }, attributes: ["id", "name"] })
          : [];
        const userNameMap = new Map(memberUsers.map((u) => [u.id, u.name]));
        const members = memberships.map((m) => ({
          id: m.userId,
          role: m.role,
          name: userNameMap.get(m.userId) || "Thành viên",
        }));

        const recentMessages = recentRows.reverse().map((r) => ({
          authorName: r.isAi ? AI_BOT_AUTHOR.name : userNameMap.get(r.userId) || "Thành viên",
          content: r.content,
        }));

        const aiReplyText = await generateBoardAiReply({
          board: board || { id: boardId, name: "Dự án nhóm", description: "" },
          columns,
          tasks,
          members,
          recentMessages,
          prompt: trimmedContent,
          requesterName: author?.name || req.user.name,
        });

        const aiMsg = await BoardMessage.create({
          boardId,
          userId: req.user.id,
          content: aiReplyText.slice(0, 2000),
          isAi: true,
          createdAt: new Date(Date.now() + 50),
        });

        hydratedAi = { ...aiMsg.toJSON(), isAi: true, author: AI_BOT_AUTHOR };
        emitBoardEvent(boardId, "board:message-new", { boardId, message: hydratedAi });
      } catch (aiErr) {
        console.error("Lỗi tạo phản hồi @troliao trong phòng chat nhóm:", aiErr);
      }
    }

    res.status(201).json({
      message: hydrated,
      ...(hydratedAi ? { aiMessage: hydratedAi } : {}),
    });
  } catch (error) {
    console.error("Lỗi gửi tin nhắn bảng:", error);
    res.status(500).json({ message: "Không thể gửi tin nhắn!" });
  }
});

module.exports = router;
module.exports.findMentionedBoardMembers = findMentionedBoardMembers;
