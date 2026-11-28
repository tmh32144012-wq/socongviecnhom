const express = require("express");
const {
  Board,
  BoardMember,
  BoardColumn,
  BoardLabel,
  BoardMessage,
  ActivityLog,
  Task,
  TaskAssignee,
  TaskComment,
  TaskProgressStep,
  TaskLabel,
  Attachment,
  Notification,
  User,
  Op,
} = require("../models");
const authenticateToken = require("../middleware/auth");
const {
  getAcceptedMembership,
  canAccessBoard,
  isBoardAdmin,
  isBoardOwner,
} = require("../utils/boardAccess");
const { hydrateTasks, TASK_ATTRIBUTES } = require("../utils/taskHydrator");
const { emitBoardEvent, emitUserEvent } = require("../socket");
const { sendBoardInvitationEmail } = require("../utils/mailer");

const router = express.Router();
router.use(authenticateToken);

const DEFAULT_COLUMNS = [
  { title: "To Do", color: "#64748b", isDone: false, position: 0 },
  { title: "Doing", color: "#0284c7", isDone: false, position: 1 },
  { title: "Done", color: "#15803d", isDone: true, position: 2 },
];

async function getHydratedBoardMembers(boardId) {
  const rows = await BoardMember.findAll({
    where: { boardId },
    order: [["joinedAt", "ASC"]],
  });
  const userIds = rows.map((r) => r.userId);
  const users = userIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ["id", "name", "email", "avatar"],
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

  return rows
    .map((r) => {
      const user = userMap.get(r.userId);
      if (!user) return null;
      return {
        id: r.id,
        boardId: r.boardId,
        userId: r.userId,
        role: r.role,
        status: r.status,
        joinedAt: r.joinedAt,
        user,
      };
    })
    .filter(Boolean);
}

// ==================================================
// 1. GET /api/boards — Danh sách Board của user + lời mời đang chờ
// ==================================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const myMemberships = await BoardMember.findAll({
      where: { userId },
      order: [["joinedAt", "DESC"]],
    });

    const acceptedBoardIds = myMemberships
      .filter((m) => m.status === "accepted")
      .map((m) => m.boardId);
    const pendingBoardIds = myMemberships
      .filter((m) => m.status === "pending")
      .map((m) => m.boardId);

    const allBoardIds = [...new Set([...acceptedBoardIds, ...pendingBoardIds])];

    if (allBoardIds.length === 0) {
      return res.json({ boards: [], pendingInvitations: [] });
    }

    const [boards, allMembers, allColumns, allTasks] = await Promise.all([
      Board.findAll({
        where: { id: { [Op.in]: allBoardIds } },
        order: [["updatedAt", "DESC"]],
      }),
      BoardMember.findAll({
        where: { boardId: { [Op.in]: allBoardIds }, status: "accepted" },
      }),
      BoardColumn.findAll({
        where: { boardId: { [Op.in]: allBoardIds } },
        order: [["position", "ASC"]],
      }),
      Task.findAll({
        where: { boardId: { [Op.in]: allBoardIds }, isArchived: false },
        attributes: ["id", "boardId", "status", "progress"],
      }),
    ]);

    const memberUserIds = [...new Set([
      ...allMembers.map((m) => m.userId),
      ...boards.map((b) => b.ownerId),
    ])];
    const users = memberUserIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: memberUserIds } },
          attributes: ["id", "name", "email", "avatar"],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));

    const myMembershipMap = new Map(myMemberships.map((m) => [m.boardId, m]));

    const formatBoardSummary = (board) => {
      const bj = board.toJSON();
      const bMembers = allMembers
        .filter((m) => m.boardId === bj.id)
        .map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: userMap.get(m.userId) || null,
        }))
        .filter((m) => m.user);

      const bColumns = allColumns.filter((c) => c.boardId === bj.id);
      const bTasks = allTasks.filter((t) => t.boardId === bj.id);
      const completedTasks = bTasks.filter(
        (t) => t.status === "Hoàn thành" || t.progress === 100
      ).length;

      const myMem = myMembershipMap.get(bj.id);

      return {
        ...bj,
        owner: userMap.get(bj.ownerId) || null,
        myRole: myMem?.role || "member",
        myStatus: myMem?.status || "accepted",
        members: bMembers,
        memberCount: bMembers.length,
        columnCount: bColumns.length,
        taskCount: bTasks.length,
        completedTaskCount: completedTasks,
      };
    };

    const acceptedBoards = boards
      .filter((b) => acceptedBoardIds.includes(b.id))
      .map(formatBoardSummary);

    const pendingInvitations = boards
      .filter((b) => pendingBoardIds.includes(b.id))
      .map(formatBoardSummary);

    res.json({
      boards: acceptedBoards,
      pendingInvitations,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách Board:", error);
    res.status(500).json({ message: "Không thể tải danh sách không gian làm việc!" });
  }
});

// ==================================================
// 2. POST /api/boards — Tạo không gian làm việc mới + 3 cột mặc định
// ==================================================
router.post("/", async (req, res) => {
  try {
    const { name, description, coverColor, customColumns } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Tên không gian làm việc không được để trống!" });
    }

    const board = await Board.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      coverColor: coverColor && /^#[0-9A-Fa-f]{6}$/.test(coverColor) ? coverColor : "#0f766e",
      ownerId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Thêm chủ sở hữu làm owner
    await BoardMember.create({
      boardId: board.id,
      userId: req.user.id,
      role: "owner",
      status: "accepted",
      joinedAt: new Date(),
    });

    // Tạo cột mặc định (To Do, Doing, Done) hoặc tùy chỉnh
    const columnsToCreate =
      Array.isArray(customColumns) && customColumns.length > 0
        ? customColumns
            .filter((c) => c && c.title && c.title.trim())
            .map((c, idx) => ({
              boardId: board.id,
              title: c.title.trim(),
              color: c.color || "#64748b",
              isDone: Boolean(c.isDone),
              position: idx,
              createdAt: new Date(),
            }))
        : DEFAULT_COLUMNS.map((c) => ({
            boardId: board.id,
            ...c,
            createdAt: new Date(),
          }));

    const createdColumns = [];
    for (const col of columnsToCreate) {
      createdColumns.push(await BoardColumn.create(col));
    }

    const members = await getHydratedBoardMembers(board.id);

    res.status(201).json({
      message: "Tạo không gian làm việc thành công!",
      board: {
        ...board.toJSON(),
        myRole: "owner",
        members,
        memberCount: members.length,
        columns: createdColumns,
        columnCount: createdColumns.length,
        taskCount: 0,
        completedTaskCount: 0,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo Board:", error);
    res.status(500).json({ message: "Không thể tạo không gian làm việc!" });
  }
});

// ==================================================
// 3. GET /api/boards/:boardId — Chi tiết 1 Board (columns + tasks + members)
// ==================================================
router.get("/:boardId", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ message: "ID Board không hợp lệ!" });
    }

    const membership = await getAcceptedMembership(boardId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập không gian làm việc này!" });
    }

    const board = await Board.findByPk(boardId);
    if (!board) {
      return res.status(404).json({ message: "Không tìm thấy không gian làm việc!" });
    }

    const [members, columns, rawTasks] = await Promise.all([
      getHydratedBoardMembers(boardId),
      BoardColumn.findAll({
        where: { boardId },
        order: [["position", "ASC"], ["id", "ASC"]],
      }),
      Task.findAll({
        where: { boardId, isArchived: false },
        attributes: TASK_ATTRIBUTES,
        order: [["position", "ASC"], ["id", "DESC"]],
      }),
    ]);

    const tasks = await hydrateTasks(rawTasks);

    res.json({
      board: {
        ...board.toJSON(),
        myRole: membership.role,
      },
      members,
      columns,
      tasks,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết Board:", error);
    res.status(500).json({ message: "Không thể tải chi tiết không gian làm việc!" });
  }
});

// ==================================================
// 4. PUT /api/boards/:boardId — Cập nhật thông tin Board (owner/admin)
// ==================================================
router.put("/:boardId", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ message: "ID Board không hợp lệ!" });
    }

    const admin = await isBoardAdmin(boardId, req.user.id);
    if (!admin) {
      return res.status(403).json({ message: "Chỉ Chủ bảng hoặc Quản trị viên mới có thể chỉnh sửa!" });
    }

    const board = await Board.findByPk(boardId);
    if (!board) {
      return res.status(404).json({ message: "Không tìm thấy không gian làm việc!" });
    }

    const { name, description, coverColor } = req.body;
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ message: "Tên không gian làm việc không được để trống!" });
    }

    await board.update({
      name: name !== undefined ? name.trim() : board.name,
      description: description !== undefined ? description.trim() : board.description,
      coverColor:
        coverColor && /^#[0-9A-Fa-f]{6}$/.test(coverColor)
          ? coverColor
          : board.coverColor,
      updatedAt: new Date(),
    });

    emitBoardEvent(boardId, "board:updated", { board: board.toJSON() });

    res.json({
      message: "Cập nhật không gian làm việc thành công!",
      board,
    });
  } catch (error) {
    console.error("Lỗi cập nhật Board:", error);
    res.status(500).json({ message: "Không thể cập nhật không gian làm việc!" });
  }
});

// ==================================================
// 5. DELETE /api/boards/:boardId — Xóa Board (chỉ owner)
// ==================================================
router.delete("/:boardId", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ message: "ID Board không hợp lệ!" });
    }

    const owner = await isBoardOwner(boardId, req.user.id);
    if (!owner) {
      return res.status(403).json({ message: "Chỉ Chủ sở hữu mới có quyền xóa không gian làm việc!" });
    }

    const board = await Board.findByPk(boardId);
    if (!board) {
      return res.status(404).json({ message: "Không tìm thấy không gian làm việc!" });
    }

    // Dọn sạch các task thuộc board trước khi xóa board (SQL Server NO ACTION safe)
    const boardTasks = await Task.findAll({
      where: { boardId },
      attributes: ["id"],
    });
    const taskIds = boardTasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await TaskAssignee.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await TaskComment.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await TaskProgressStep.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await TaskLabel.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await Attachment.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await ActivityLog.destroy({ where: { taskId: { [Op.in]: taskIds } } });
      await Notification.update(
        { taskId: null },
        { where: { taskId: { [Op.in]: taskIds } } }
      );
      await Task.destroy({ where: { id: { [Op.in]: taskIds } } });
    }

    await ActivityLog.destroy({ where: { boardId } });
    await BoardMessage.destroy({ where: { boardId } });
    await BoardLabel.destroy({ where: { boardId } });
    await BoardColumn.destroy({ where: { boardId } });
    await BoardMember.destroy({ where: { boardId } });
    await board.destroy();

    emitBoardEvent(boardId, "board:deleted", { boardId });

    res.json({ message: "Đã xóa không gian làm việc!", id: boardId });
  } catch (error) {
    console.error("Lỗi xóa Board:", error);
    res.status(500).json({ message: "Không thể xóa không gian làm việc!" });
  }
});

// ==================================================
// 6. GET /api/boards/:boardId/search-users?q=... — Tìm user để mời
// ==================================================
router.get("/:boardId/search-users", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền truy cập!" });
    }

    const q = (req.query.q || "").trim().toLowerCase();
    const existingMembers = await BoardMember.findAll({
      where: { boardId },
      attributes: ["userId"],
    });
    const existingIds = existingMembers.map((m) => m.userId);

    const whereClause = {};
    if (existingIds.length > 0) {
      whereClause.id = { [Op.notIn]: existingIds };
    }
    if (q) {
      whereClause[Op.or] = [
        { email: { [Op.like]: `%${q}%` } },
        { name: { [Op.like]: `%${q}%` } },
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ["id", "name", "email", "avatar"],
      limit: 10,
      order: [["name", "ASC"]],
    });

    res.json({ users });
  } catch (error) {
    console.error("Lỗi tìm người dùng:", error);
    res.status(500).json({ message: "Không thể tìm kiếm người dùng!" });
  }
});

// ==================================================
// 7. POST /api/boards/:boardId/members — Mời hoặc thêm thành viên vào Board
// Body: { email, role?: 'member'|'admin', mode?: 'invite'|'direct' }
// ==================================================
router.post("/:boardId/members", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const admin = await isBoardAdmin(boardId, req.user.id);
    if (!admin) {
      return res.status(403).json({ message: "Chỉ Chủ bảng hoặc Quản trị viên mới có thể thêm thành viên!" });
    }

    const { email, role = "member", mode = "invite" } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập email thành viên!" });
    }

    const targetUser = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      attributes: ["id", "name", "email", "avatar"],
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản nào với email này!" });
    }

    const existing = await BoardMember.findOne({
      where: { boardId, userId: targetUser.id },
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Người dùng này đã là thành viên của không gian làm việc!" });
      }
      if (mode === "direct") {
        existing.status = "accepted";
        existing.role = role === "admin" ? "admin" : "member";
        await existing.save();
      } else {
        return res.status(400).json({ message: "Đã gửi lời mời đến người dùng này, đang chờ xác nhận!" });
      }
    } else {
      await BoardMember.create({
        boardId,
        userId: targetUser.id,
        role: role === "admin" ? "admin" : "member",
        status: mode === "direct" ? "accepted" : "pending",
        invitedBy: req.user.id,
        joinedAt: new Date(),
      });
    }

    const board = await Board.findByPk(boardId);
    const inviter = await User.findByPk(req.user.id, { attributes: ["name"] });

    // Gửi thông báo cho người được mời
    const notif = await Notification.create({
      userId: targetUser.id,
      taskId: null,
      title:
        mode === "direct"
          ? `Bạn đã được thêm vào bảng "${board.name}"`
          : `Lời mời tham gia bảng "${board.name}"`,
      message:
        mode === "direct"
          ? `${inviter?.name || "Quản trị viên"} đã thêm bạn vào không gian làm việc "${board.name}".`
          : `${inviter?.name || "Quản trị viên"} đã mời bạn tham gia không gian làm việc "${board.name}". Hãy vào mục Không gian làm việc để xác nhận!`,
      type: "invite",
      isRead: false,
      createdAt: new Date(),
    });

    const members = await getHydratedBoardMembers(boardId);
    emitBoardEvent(boardId, "board:members-updated", { boardId, members });
    emitUserEvent(targetUser.id, "board:invited", {
      boardId,
      boardName: board.name,
      mode,
      notification: notif.toJSON(),
    });

    const mailResult = await sendBoardInvitationEmail({
      to: targetUser.email,
      inviteeName: targetUser.name,
      inviterName: inviter?.name || req.user.name,
      boardName: board.name,
      role: role === "admin" ? "admin" : "member",
      mode,
    });

    res.status(201).json({
      message:
        mode === "direct"
          ? `Đã thêm ${targetUser.name} vào không gian làm việc!`
          : mailResult.sent
          ? `Đã gửi lời mời & email thông báo tới ${targetUser.name}!`
          : `Đã gửi lời mời tham gia đến ${targetUser.name}!`,
      members,
      emailSent: mailResult.sent,
    });
  } catch (error) {
    console.error("Lỗi thêm thành viên:", error);
    res.status(500).json({ message: "Không thể thêm thành viên!" });
  }
});

// ==================================================
// 8. POST /api/boards/:boardId/invitations/respond — Chấp nhận / Từ chối lời mời
// ==================================================
router.post("/:boardId/invitations/respond", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ message: "ID Board không hợp lệ!" });
    }
    const { action } = req.body; // 'accept' | 'decline'

    const invite = await BoardMember.findOne({
      where: { boardId, userId: req.user.id, status: "pending" },
    });

    if (!invite) {
      return res.status(404).json({ message: "Không tìm thấy lời mời tham gia nào!" });
    }

    const board = await Board.findByPk(boardId);
    const me = await User.findByPk(req.user.id, { attributes: ["name"] });

    if (action === "accept") {
      invite.status = "accepted";
      invite.joinedAt = new Date();
      await invite.save();

      if (invite.invitedBy) {
        await Notification.create({
          userId: invite.invitedBy,
          taskId: null,
          title: `Thành viên mới tham gia "${board?.name || "Board"}"`,
          message: `${me?.name || "Một thành viên"} đã chấp nhận lời mời tham gia bảng "${board?.name || ""}".`,
          type: "system",
          isRead: false,
          createdAt: new Date(),
        });
      }

      const members = await getHydratedBoardMembers(boardId);
      emitBoardEvent(boardId, "board:members-updated", { boardId, members });

      return res.json({
        message: `Bạn đã tham gia không gian làm việc "${board?.name || ""}"!`,
        boardId,
      });
    } else {
      await invite.destroy();
      const members = await getHydratedBoardMembers(boardId);
      emitBoardEvent(boardId, "board:members-updated", { boardId, members });

      return res.json({
        message: "Đã từ chối lời mời tham gia.",
        boardId,
      });
    }
  } catch (error) {
    console.error("Lỗi phản hồi lời mời:", error);
    res.status(500).json({ message: "Không thể xử lý lời mời!" });
  }
});

// ==================================================
// 9. PATCH /api/boards/:boardId/members/:memberId — Đổi vai trò thành viên (owner)
// ==================================================
router.patch("/:boardId/members/:memberId", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const memberId = Number(req.params.memberId);
    const { role } = req.body;

    const owner = await isBoardOwner(boardId, req.user.id);
    if (!owner) {
      return res.status(403).json({ message: "Chỉ Chủ sở hữu mới có quyền thay đổi vai trò!" });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ!" });
    }

    const member = await BoardMember.findOne({ where: { id: memberId, boardId } });
    if (!member) {
      return res.status(404).json({ message: "Không tìm thấy thành viên!" });
    }
    if (member.role === "owner") {
      return res.status(400).json({ message: "Không thể thay đổi vai trò của Chủ sở hữu!" });
    }

    member.role = role;
    await member.save();

    const members = await getHydratedBoardMembers(boardId);
    emitBoardEvent(boardId, "board:members-updated", { boardId, members });

    res.json({ message: "Đã cập nhật vai trò thành viên!", members });
  } catch (error) {
    console.error("Lỗi đổi vai trò:", error);
    res.status(500).json({ message: "Không thể cập nhật vai trò!" });
  }
});

// ==================================================
// 10. DELETE /api/boards/:boardId/members/:memberId — Xóa thành viên hoặc rời Board
// ==================================================
router.delete("/:boardId/members/:memberId", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const memberId = Number(req.params.memberId);

    const member = await BoardMember.findOne({ where: { id: memberId, boardId } });
    if (!member) {
      return res.status(404).json({ message: "Không tìm thấy thành viên!" });
    }

    const isSelf = Number(member.userId) === Number(req.user.id);
    const admin = await isBoardAdmin(boardId, req.user.id);

    if (!isSelf && !admin) {
      return res.status(403).json({ message: "Bạn không có quyền xóa thành viên này!" });
    }

    if (member.role === "owner") {
      return res.status(400).json({ message: "Chủ sở hữu không thể rời bảng. Hãy xóa bảng nếu không cần nữa." });
    }

    // Gỡ gán việc của thành viên trong board này
    const boardTasks = await Task.findAll({ where: { boardId }, attributes: ["id"] });
    const taskIds = boardTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      await TaskAssignee.destroy({
        where: { taskId: { [Op.in]: taskIds }, userId: member.userId },
      });
    }

    const removedUserId = member.userId;
    await member.destroy();

    const members = await getHydratedBoardMembers(boardId);
    emitBoardEvent(boardId, "board:members-updated", { boardId, members });
    emitUserEvent(removedUserId, "board:removed", { boardId });

    res.json({
      message: isSelf ? "Bạn đã rời khỏi không gian làm việc." : "Đã xóa thành viên khỏi bảng!",
      members,
    });
  } catch (error) {
    console.error("Lỗi xóa thành viên:", error);
    res.status(500).json({ message: "Không thể xóa thành viên!" });
  }
});

module.exports = router;
