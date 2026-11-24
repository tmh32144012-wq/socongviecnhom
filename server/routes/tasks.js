const express = require("express");
const {
  Task,
  Category,
  Board,
  BoardMember,
  BoardColumn,
  TaskAssignee,
  TaskComment,
  TaskProgressStep,
  Notification,
  User,
  Op,
} = require("../models");
const authenticateToken = require("../middleware/auth");
const {
  canAccessBoard,
  canAccessTask,
  buildAccessibleTasksWhere,
} = require("../utils/boardAccess");
const {
  TASK_ATTRIBUTES,
  hydrateTasks,
  hydrateSingleTask,
} = require("../utils/taskHydrator");
const { emitBoardEvent, emitUserEvent } = require("../socket");
const { logActivity } = require("../utils/activityLogger");
const { spawnNextRecurringTaskIfNeeded } = require("../utils/recurrenceHelper");

const router = express.Router();
router.use(authenticateToken);

/**
 * Helper: Lấy thông tin người thao tác hiện tại (ID + Tên hiển thị)
 */
async function getActorMeta(userId) {
  const actor = await User.findByPk(userId, { attributes: ["id", "name"] });
  return {
    lastModifiedById: actor?.id || userId || null,
    lastModifiedByName: actor?.name || null,
  };
}

/**
 * Helper: Phát sự kiện realtime cho cả phòng Board lẫn từng thành viên liên quan
 * (đảm bảo trang "Tất cả công việc" cũng cập nhật ngay lập tức theo thời gian thực!)
 */
async function broadcastTaskUpdate(taskObj, eventName = "task:updated", extra = {}) {
  if (!taskObj) return;
  const payload = {
    boardId: taskObj.boardId || null,
    task: taskObj,
    ...extra,
  };

  if (taskObj.boardId) {
    emitBoardEvent(taskObj.boardId, eventName, payload);
    try {
      const members = await BoardMember.findAll({
        where: { boardId: taskObj.boardId, status: "accepted" },
        attributes: ["userId"],
      });
      const recipientIds = new Set(members.map((m) => m.userId));
      if (taskObj.userId) recipientIds.add(taskObj.userId);
      for (const uid of recipientIds) {
        emitUserEvent(uid, eventName, payload);
      }
    } catch {
      // ignore fan-out errors
    }
  } else if (taskObj.userId) {
    emitUserEvent(taskObj.userId, eventName, payload);
  }
}

/**
 * Helper: Đồng bộ status & progress khi đổi cột Kanban
 */
function deriveStatusFromColumn(column, currentStatus, currentProgress) {
  if (!column) return { status: currentStatus, progress: currentProgress };

  if (column.isDone) {
    return { status: "Hoàn thành", progress: 100 };
  }

  const titleLower = (column.title || "").toLowerCase();
  if (
    titleLower.includes("doing") ||
    titleLower.includes("đang") ||
    titleLower.includes("progress") ||
    titleLower.includes("review") ||
    titleLower.includes("kiểm")
  ) {
    return {
      status: "Đang thực hiện",
      progress: currentProgress === 100 ? 60 : Math.max(currentProgress || 0, 25),
    };
  }

  if (
    titleLower.includes("to do") ||
    titleLower.includes("todo") ||
    titleLower.includes("chưa") ||
    titleLower.includes("backlog")
  ) {
    return {
      status: "Chưa bắt đầu",
      progress: currentProgress === 100 ? 0 : currentProgress || 0,
    };
  }

  return {
    status: currentStatus === "Hoàn thành" ? "Đang thực hiện" : currentStatus || "Đang thực hiện",
    progress: currentProgress === 100 ? 50 : currentProgress || 0,
  };
}

/**
 * Helper: Đồng bộ danh sách người được gán (nhiều thành viên) và gửi thông báo
 */
async function syncTaskAssignees(task, assigneeIds, actorId) {
  if (!Array.isArray(assigneeIds)) return;

  const uniqueIds = [...new Set(assigneeIds.map(Number).filter(Number.isInteger))];

  // Nếu task thuộc Board, chỉ cho phép gán thành viên đã chấp nhận của Board đó
  let validUserIds = uniqueIds;
  if (task.boardId) {
    const members = await BoardMember.findAll({
      where: {
        boardId: task.boardId,
        status: "accepted",
        userId: { [Op.in]: uniqueIds.length ? uniqueIds : [-1] },
      },
      attributes: ["userId"],
    });
    validUserIds = members.map((m) => m.userId);
  }

  const existing = await TaskAssignee.findAll({
    where: { taskId: task.id },
    attributes: ["userId"],
  });
  const existingIds = new Set(existing.map((e) => e.userId));
  const newlyAdded = validUserIds.filter((uid) => !existingIds.has(uid));

  await TaskAssignee.destroy({ where: { taskId: task.id } });
  for (const uid of validUserIds) {
    await TaskAssignee.create({
      taskId: task.id,
      userId: uid,
      assignedAt: new Date(),
    });
  }

  // Thông báo cho các thành viên mới được gán (trừ người tự gán cho mình)
  if (newlyAdded.length > 0) {
    const actor = await User.findByPk(actorId, { attributes: ["name"] });
    for (const uid of newlyAdded) {
      if (Number(uid) === Number(actorId)) continue;
      const notif = await Notification.create({
        userId: uid,
        taskId: task.id,
        title: "Bạn được giao công việc mới",
        message: `${actor?.name || "Thành viên nhóm"} đã gán bạn vào thẻ "${task.title}"${task.dueDate ? ` (Hạn: ${task.dueDate})` : ""}.`,
        type: "assign",
        isRead: false,
        createdAt: new Date(),
      });
      emitUserEvent(uid, "notification:new", { notification: notif.toJSON() });
    }
  }
}

// ==================================================
// 1. GET /api/tasks — Lấy tất cả công việc cá nhân & nhóm mà user được truy cập
// Query: ?boardId=<id|personal>
// ==================================================
router.get("/", async (req, res) => {
  try {
    const { boardId } = req.query;
    let whereClause;

    if (boardId === "personal") {
      whereClause = { userId: req.user.id, boardId: null, isArchived: false };
    } else if (boardId !== undefined && boardId !== "") {
      const numericBoardId = Number(boardId);
      if (!Number.isInteger(numericBoardId)) {
        return res.status(400).json({ message: "boardId không hợp lệ!" });
      }
      const allowed = await canAccessBoard(numericBoardId, req.user.id);
      if (!allowed) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập bảng này!" });
      }
      whereClause = { boardId: numericBoardId, isArchived: false };
    } else {
      whereClause = await buildAccessibleTasksWhere(req.user.id, { isArchived: false });
    }

    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    if (pageParam !== undefined) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.min(200, Math.max(5, parseInt(limitParam || "50", 10)));
      const offset = (page - 1) * limit;

      const { rows, count } = await Task.findAndCountAll({
        where: whereClause,
        attributes: TASK_ATTRIBUTES,
        order: [["position", "ASC"], ["id", "DESC"]],
        limit,
        offset,
      });

      const hydrated = await hydrateTasks(rows);
      return res.json({
        tasks: hydrated,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: offset + rows.length < count,
        },
      });
    }

    const tasks = await Task.findAll({
      where: whereClause,
      attributes: TASK_ATTRIBUTES,
      order: [["position", "ASC"], ["id", "DESC"]],
    });

    const hydrated = await hydrateTasks(tasks);
    res.json(hydrated);
  } catch (error) {
    console.error("Lỗi lấy công việc:", error);
    res.status(500).json({ message: "Không thể lấy công việc!" });
  }
});

// ==================================================
// 2. GET /api/tasks/archived — Công việc đã lưu trữ
// ==================================================
router.get("/archived", async (req, res) => {
  try {
    const whereClause = await buildAccessibleTasksWhere(req.user.id, { isArchived: true });
    const tasks = await Task.findAll({
      where: whereClause,
      attributes: TASK_ATTRIBUTES,
      order: [["updatedAt", "DESC"]],
    });

    const hydrated = await hydrateTasks(tasks);
    res.json(hydrated);
  } catch (error) {
    console.error("Lỗi lấy danh sách lưu trữ:", error);
    res.status(500).json({ message: "Không thể lấy danh sách lưu trữ!" });
  }
});

// ==================================================
// 3. GET /api/tasks/:id — Chi tiết 1 công việc
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID công việc không hợp lệ!" });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền xem công việc này!" });
    }

    const hydrated = await hydrateSingleTask(id);
    res.json(hydrated);
  } catch (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    res.status(500).json({ message: "Không thể lấy công việc!" });
  }
});

// ==================================================
// 4. POST /api/tasks — Tạo công việc mới (cá nhân hoặc trong Board/Column)
// ==================================================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      startDate,
      dueDate,
      progress,
      notes,
      categoryId,
      boardId,
      columnId,
      assigneeIds,
      progressSteps,
      recurrence = "none",
    } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Tên công việc không được để trống!" });
    }

    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      return res.status(400).json({ message: "Ngày bắt đầu không được sau ngày hết hạn!" });
    }

    // Xử lý Board & Column nếu là việc nhóm
    let normalizedBoardId = null;
    let normalizedColumnId = null;
    let targetColumn = null;
    let nextPosition = 0;

    if (boardId !== undefined && boardId !== null && boardId !== "") {
      normalizedBoardId = Number(boardId);
      const allowed = await canAccessBoard(normalizedBoardId, req.user.id);
      if (!allowed) {
        return res.status(403).json({ message: "Bạn không phải thành viên của không gian làm việc này!" });
      }

      if (columnId !== undefined && columnId !== null && columnId !== "") {
        targetColumn = await BoardColumn.findOne({
          where: { id: Number(columnId), boardId: normalizedBoardId },
        });
      }
      if (!targetColumn) {
        targetColumn = await BoardColumn.findOne({
          where: { boardId: normalizedBoardId },
          order: [["position", "ASC"], ["id", "ASC"]],
        });
      }

      if (targetColumn) {
        normalizedColumnId = targetColumn.id;
        nextPosition = await Task.count({
          where: { boardId: normalizedBoardId, columnId: normalizedColumnId, isArchived: false },
        });
      }
    }

    // Xử lý Category
    let normalizedCategoryId = null;
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      normalizedCategoryId = Number(categoryId);
      if (!Number.isInteger(normalizedCategoryId)) {
        return res.status(400).json({ message: "Danh mục không hợp lệ!" });
      }
      const category = await Category.findOne({
        where: { id: normalizedCategoryId, userId: req.user.id },
      });
      if (category) {
        normalizedCategoryId = category.id;
      } else {
        normalizedCategoryId = null;
      }
    }

    const validPriorities = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
    const taskPriority = validPriorities.includes(priority) ? priority : "Trung bình";

    let initialProgress = Number(progress) || 0;
    if (initialProgress < 0) initialProgress = 0;
    if (initialProgress > 100) initialProgress = 100;

    let initialStatus =
      status ||
      (initialProgress === 100
        ? "Hoàn thành"
        : initialProgress > 0
        ? "Đang thực hiện"
        : "Chưa bắt đầu");
    if (status === "Đang làm") initialStatus = "Đang thực hiện";

    if (targetColumn) {
      const derived = deriveStatusFromColumn(targetColumn, initialStatus, initialProgress);
      initialStatus = derived.status;
      initialProgress = derived.progress;
    }

    const actorMeta = await getActorMeta(req.user.id);
    const now = new Date();
    const isInitialDone = initialStatus === "Hoàn thành" || initialProgress === 100;

    const task = await Task.create({
      userId: req.user.id,
      boardId: normalizedBoardId,
      columnId: normalizedColumnId,
      position: nextPosition,
      title: title.trim(),
      description: description ? description.trim() : "",
      priority: taskPriority,
      status: initialStatus,
      startDate: startDate || null,
      dueDate: dueDate || null,
      progress: initialProgress,
      notes: notes ? notes.trim() : "",
      isArchived: false,
      categoryId: normalizedCategoryId,
      recurrence: ["none", "daily", "weekly", "monthly"].includes(recurrence) ? recurrence : "none",
      createdAt: now,
      updatedAt: now,
      completedAt: isInitialDone ? now : null,
      ...actorMeta,
    });

    // Progress steps
    if (Array.isArray(progressSteps) && progressSteps.length > 0) {
      for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        if (step && step.title && step.title.trim()) {
          await TaskProgressStep.create({
            taskId: task.id,
            title: step.title.trim(),
            completed: Boolean(step.completed),
            stepOrder: i + 1,
          });
        }
      }
      const steps = await TaskProgressStep.findAll({ where: { taskId: task.id } });
      const completedCount = steps.filter((s) => s.completed).length;
      const calculatedProgress =
        steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : initialProgress;
      task.progress = calculatedProgress;
      if (calculatedProgress === 100) {
        task.status = "Hoàn thành";
        task.completedAt = task.completedAt || new Date();
      }
      await task.save();
    }

    // Assignees
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await syncTaskAssignees(task, assigneeIds, req.user.id);
    }

    if (normalizedBoardId) {
      await Board.update({ updatedAt: new Date() }, { where: { id: normalizedBoardId } });
    }

    await Notification.create({
      userId: req.user.id,
      taskId: task.id,
      title: "Công việc mới đã tạo",
      message: `Bạn vừa thêm công việc mới: "${task.title}"`,
      type: "new",
      isRead: false,
      createdAt: new Date(),
    });

    const fullTask = await hydrateSingleTask(task.id);
    await logActivity({
      boardId: normalizedBoardId,
      taskId: task.id,
      userId: req.user.id,
      action: "task:created",
      summary: `${actorMeta.lastModifiedByName || "Thành viên"} đã tạo công việc "${task.title}"`,
    });

    await broadcastTaskUpdate(fullTask, "task:created");

    res.status(201).json({
      message: "Thêm công việc thành công!",
      task: fullTask,
    });
  } catch (error) {
    console.error("Lỗi thêm công việc:", error);
    res.status(500).json({ message: "Không thể thêm công việc!" });
  }
});

// ==================================================
// 5. PUT /api/tasks/:id — Cập nhật công việc
// ==================================================
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID công việc không hợp lệ!" });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa công việc này!" });
    }

    const {
      title,
      description,
      priority,
      status,
      startDate,
      dueDate,
      progress,
      notes,
      categoryId,
      columnId,
      position,
      isArchived,
      progressSteps,
      assigneeIds,
      recurrence,
    } = req.body;

    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
      return res.status(400).json({ message: "Tên công việc không được để trống!" });
    }

    const newStart = startDate !== undefined ? startDate : task.startDate;
    const newDue = dueDate !== undefined ? dueDate : task.dueDate;
    if (newStart && newDue && new Date(newStart) > new Date(newDue)) {
      return res.status(400).json({ message: "Ngày bắt đầu không được sau ngày hết hạn!" });
    }

    let normalizedCategoryId = task.categoryId;
    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        normalizedCategoryId = null;
      } else {
        const cid = Number(categoryId);
        if (Number.isInteger(cid)) {
          normalizedCategoryId = cid;
        }
      }
    }

    const validPriorities = ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
    const newPriority =
      priority !== undefined && validPriorities.includes(priority) ? priority : task.priority;

    let newProgress = progress !== undefined ? Number(progress) : task.progress;
    if (newProgress < 0) newProgress = 0;
    if (newProgress > 100) newProgress = 100;

    let newStatus = status !== undefined ? status : task.status;
    if (newStatus === "Đang làm") newStatus = "Đang thực hiện";

    // Nếu thay đổi columnId trong Board
    let newColumnId = task.columnId;
    if (columnId !== undefined && task.boardId) {
      const targetCol = await BoardColumn.findOne({
        where: { id: Number(columnId), boardId: task.boardId },
      });
      if (targetCol) {
        newColumnId = targetCol.id;
        if (status === undefined && progress === undefined) {
          const derived = deriveStatusFromColumn(targetCol, newStatus, newProgress);
          newStatus = derived.status;
          newProgress = derived.progress;
        }
      }
    }

    if (newStatus === "Hoàn thành" || newProgress === 100) {
      newStatus = "Hoàn thành";
      newProgress = 100;
    } else if (newProgress > 0 && newStatus === "Chưa bắt đầu") {
      newStatus = "Đang thực hiện";
    }

    // Progress steps replacement
    if (progressSteps !== undefined && Array.isArray(progressSteps)) {
      await TaskProgressStep.destroy({ where: { taskId: id } });
      for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        if (step && typeof step.title === "string" && step.title.trim() !== "") {
          await TaskProgressStep.create({
            taskId: id,
            title: step.title.trim(),
            completed: Boolean(step.completed),
            stepOrder: i + 1,
          });
        }
      }

      const freshSteps = await TaskProgressStep.findAll({ where: { taskId: id } });
      if (freshSteps.length > 0) {
        const completedCount = freshSteps.filter((s) => s.completed).length;
        newProgress = Math.round((completedCount / freshSteps.length) * 100);
        if (newProgress === 100) {
          newStatus = "Hoàn thành";
        } else if (newProgress > 0 && newStatus === "Hoàn thành") {
          newStatus = "Đang thực hiện";
        }
      }
    }

    const previousStatus = task.status;
    const actorMeta = await getActorMeta(req.user.id);
    const now = new Date();
    const nextCompletedAt =
      newStatus === "Hoàn thành"
        ? previousStatus === "Hoàn thành" && task.completedAt
          ? task.completedAt
          : now
        : null;

    await task.update({
      title: title !== undefined ? title.trim() : task.title,
      description:
        description !== undefined ? (description ? description.trim() : "") : task.description,
      priority: newPriority,
      status: newStatus,
      startDate: newStart || null,
      dueDate: newDue || null,
      progress: newProgress,
      notes: notes !== undefined ? (notes ? notes.trim() : "") : task.notes,
      categoryId: normalizedCategoryId,
      columnId: newColumnId,
      position: position !== undefined ? Number(position) : task.position,
      isArchived: isArchived !== undefined ? Boolean(isArchived) : task.isArchived,
      recurrence:
        recurrence !== undefined && ["none", "daily", "weekly", "monthly"].includes(recurrence)
          ? recurrence
          : task.recurrence,
      updatedAt: now,
      completedAt: nextCompletedAt,
      ...actorMeta,
    });

    if (assigneeIds !== undefined) {
      await syncTaskAssignees(task, assigneeIds, req.user.id);
    }

    if (previousStatus !== "Hoàn thành" && newStatus === "Hoàn thành") {
      await Notification.create({
        userId: req.user.id,
        taskId: task.id,
        title: "Hoàn thành công việc",
        message: `Công việc "${task.title}" đã được đánh dấu hoàn thành!`,
        type: "completed",
        isRead: false,
        createdAt: new Date(),
      });

      // Nếu là công việc lặp định kỳ -> tự tạo chu kỳ tiếp theo
      const spawned = await spawnNextRecurringTaskIfNeeded(task, req.user.id);
      if (spawned) {
        const hydratedSpawn = await hydrateSingleTask(spawned.id);
        await broadcastTaskUpdate(hydratedSpawn, "task:created");
        await logActivity({
          boardId: task.boardId,
          taskId: spawned.id,
          userId: req.user.id,
          action: "task:recurred",
          summary: `Hệ thống tự động tạo chu kỳ tiếp theo (${task.recurrence}) cho "${task.title}" (Hạn mới: ${spawned.dueDate || "—"})`,
        });
      }
    }

    await logActivity({
      boardId: task.boardId,
      taskId: task.id,
      userId: req.user.id,
      action: previousStatus !== newStatus ? "task:status-changed" : "task:updated",
      summary:
        previousStatus !== newStatus
          ? `${actorMeta.lastModifiedByName || "Thành viên"} đã đổi trạng thái "${task.title}" sang "${newStatus}"`
          : `${actorMeta.lastModifiedByName || "Thành viên"} đã cập nhật công việc "${task.title}"`,
    });

    const updatedTask = await hydrateSingleTask(id);
    await broadcastTaskUpdate(updatedTask, "task:updated");

    res.json({
      message: "Cập nhật công việc thành công!",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Lỗi cập nhật công việc:", error);
    res.status(500).json({ message: "Không thể cập nhật công việc!" });
  }
});

// ==================================================
// 6. PATCH /api/tasks/:id/move — Kéo thả thẻ giữa các cột & sắp xếp thứ tự
// Body: { columnId, position }
// ==================================================
router.patch("/:id/move", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { columnId, position = 0 } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy thẻ công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền di chuyển thẻ này!" });
    }

    const targetCol = await BoardColumn.findOne({
      where: { id: Number(columnId), boardId: task.boardId },
    });

    if (!targetCol) {
      return res.status(400).json({ message: "Cột đích không hợp lệ!" });
    }

    const oldColumnId = task.columnId;
    const newColumnId = targetCol.id;

    // Lấy danh sách task trong cột đích (không tính task hiện tại)
    const targetTasks = await Task.findAll({
      where: {
        boardId: task.boardId,
        columnId: newColumnId,
        isArchived: false,
        id: { [Op.ne]: id },
      },
      order: [["position", "ASC"], ["id", "ASC"]],
    });

    const previousMoveStatus = task.status;
    const insertIdx = Math.max(0, Math.min(Number(position) || 0, targetTasks.length));
    const derived = deriveStatusFromColumn(targetCol, task.status, task.progress);

    // Chèn task vào vị trí mới và đánh số lại
    const orderedTarget = [
      ...targetTasks.slice(0, insertIdx),
      task,
      ...targetTasks.slice(insertIdx),
    ];

    const actorMeta = await getActorMeta(req.user.id);
    const moveNow = new Date();
    const moveCompletedAt =
      derived.status === "Hoàn thành"
        ? task.status === "Hoàn thành" && task.completedAt
          ? task.completedAt
          : moveNow
        : null;

    for (let i = 0; i < orderedTarget.length; i++) {
      const t = orderedTarget[i];
      if (t.id === id) {
        await t.update({
          columnId: newColumnId,
          position: i,
          status: derived.status,
          progress: derived.progress,
          updatedAt: moveNow,
          completedAt: moveCompletedAt,
          ...actorMeta,
        });
      } else if (t.position !== i) {
        await t.update({ position: i });
      }
    }

    // Nếu chuyển từ cột khác sang, đánh số lại cột cũ
    if (oldColumnId && oldColumnId !== newColumnId) {
      const oldTasks = await Task.findAll({
        where: {
          boardId: task.boardId,
          columnId: oldColumnId,
          isArchived: false,
        },
        order: [["position", "ASC"], ["id", "ASC"]],
      });
      for (let i = 0; i < oldTasks.length; i++) {
        if (oldTasks[i].position !== i) {
          await oldTasks[i].update({ position: i });
        }
      }
    }

    const updatedTask = await hydrateSingleTask(id);

    await logActivity({
      boardId: task.boardId,
      taskId: id,
      userId: req.user.id,
      action: "task:moved",
      summary: `${actorMeta.lastModifiedByName || "Thành viên"} đã di chuyển "${task.title}" sang cột "${targetCol.title}"`,
    });

    if (previousMoveStatus !== "Hoàn thành" && derived.status === "Hoàn thành") {
      const spawned = await spawnNextRecurringTaskIfNeeded(task, req.user.id);
      if (spawned) {
        const hydratedSpawn = await hydrateSingleTask(spawned.id);
        await broadcastTaskUpdate(hydratedSpawn, "task:created");
      }
    }

    emitBoardEvent(task.boardId, "task:moved", {
      boardId: task.boardId,
      task: updatedTask,
      fromColumnId: oldColumnId,
      toColumnId: newColumnId,
      position: insertIdx,
    });
    await broadcastTaskUpdate(updatedTask, "task:updated");

    res.json({
      message: "Đã di chuyển thẻ công việc!",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Lỗi di chuyển thẻ:", error);
    res.status(500).json({ message: "Không thể di chuyển thẻ công việc!" });
  }
});

// ==================================================
// 7. PUT /api/tasks/:id/assignees — Cập nhật danh sách thành viên được gán
// Body: { assigneeIds: number[] }
// ==================================================
router.put("/:id/assignees", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { assigneeIds } = req.body;

    if (!Array.isArray(assigneeIds)) {
      return res.status(400).json({ message: "Danh sách thành viên không hợp lệ!" });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền gán thành viên cho thẻ này!" });
    }

    const actorMeta = await getActorMeta(req.user.id);
    await syncTaskAssignees(task, assigneeIds, req.user.id);
    await task.update({ updatedAt: new Date(), ...actorMeta });

    const updatedTask = await hydrateSingleTask(id);

    if (task.boardId) {
      emitBoardEvent(task.boardId, "task:assignees-updated", {
        boardId: task.boardId,
        task: updatedTask,
      });
    }
    await broadcastTaskUpdate(updatedTask, "task:updated");

    res.json({
      message: "Đã cập nhật thành viên phụ trách!",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Lỗi gán thành viên:", error);
    res.status(500).json({ message: "Không thể cập nhật thành viên phụ trách!" });
  }
});

// ==================================================
// 8. PUT /api/tasks/:taskId/steps/:stepId — Cập nhật 1 bước checklist
// ==================================================
router.put("/:taskId/steps/:stepId", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const stepId = Number(req.params.stepId);
    const { title, completed } = req.body;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật công việc này!" });
    }

    const step = await TaskProgressStep.findOne({ where: { id: stepId, taskId } });
    if (!step) {
      return res.status(404).json({ message: "Không tìm thấy bước thực hiện!" });
    }

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ message: "Tên bước không được để trống!" });
      }
      step.title = title.trim();
    }

    if (completed !== undefined) {
      step.completed = Boolean(completed);
    }

    await step.save();

    const actorMeta = await getActorMeta(req.user.id);
    const stepNow = new Date();
    const allSteps = await TaskProgressStep.findAll({ where: { taskId } });
    if (allSteps.length > 0) {
      const completedCount = allSteps.filter((s) => s.completed).length;
      const newProgress = Math.round((completedCount / allSteps.length) * 100);
      task.progress = newProgress;
      if (newProgress === 100) {
        task.status = "Hoàn thành";
        task.completedAt = task.completedAt || stepNow;
      } else if (task.status === "Hoàn thành" && newProgress < 100) {
        task.status = "Đang thực hiện";
        task.completedAt = null;
      }
    }
    task.updatedAt = stepNow;
    task.lastModifiedById = actorMeta.lastModifiedById;
    task.lastModifiedByName = actorMeta.lastModifiedByName;
    await task.save();

    const updatedTask = await hydrateSingleTask(taskId);
    await broadcastTaskUpdate(updatedTask, "task:updated");

    res.json({
      message: "Cập nhật bước thực hiện thành công!",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Lỗi cập nhật bước thực hiện:", error);
    res.status(500).json({ message: "Không thể cập nhật bước thực hiện!" });
  }
});

// ==================================================
// 9. PATCH /api/tasks/:id/archive — Lưu trữ
// ==================================================
router.patch("/:id/archive", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền lưu trữ công việc này!" });
    }

    await task.update({ isArchived: true, updatedAt: new Date() });

    if (task.boardId) {
      emitBoardEvent(task.boardId, "task:deleted", { boardId: task.boardId, taskId: id });
    }

    res.json({ message: "Đã chuyển công việc vào kho lưu trữ!", task });
  } catch (error) {
    console.error("Lỗi lưu trữ công việc:", error);
    res.status(500).json({ message: "Không thể lưu trữ công việc!" });
  }
});

// ==================================================
// 10. PATCH /api/tasks/:id/restore — Khôi phục
// ==================================================
router.patch("/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền khôi phục công việc này!" });
    }

    await task.update({ isArchived: false, updatedAt: new Date() });
    const fullTask = await hydrateSingleTask(id);

    if (task.boardId) {
      emitBoardEvent(task.boardId, "task:created", { boardId: task.boardId, task: fullTask });
    }

    res.json({ message: "Đã khôi phục công việc thành công!", task: fullTask });
  } catch (error) {
    console.error("Lỗi khôi phục công việc:", error);
    res.status(500).json({ message: "Không thể khôi phục công việc!" });
  }
});

// ==================================================
// 11. DELETE /api/tasks/:id & DELETE /api/tasks/:id/permanent
// ==================================================
async function permanentlyDeleteTask(task) {
  const id = task.id;
  await TaskAssignee.destroy({ where: { taskId: id } });
  await TaskComment.destroy({ where: { taskId: id } });
  await TaskProgressStep.destroy({ where: { taskId: id } });
  await Notification.destroy({ where: { taskId: id } });
  await task.destroy();
}

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isPermanent = req.query.permanent === "true";

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền xóa công việc này!" });
    }

    const boardId = task.boardId;

    if (isPermanent || task.isArchived) {
      await permanentlyDeleteTask(task);
      if (boardId) emitBoardEvent(boardId, "task:deleted", { boardId, taskId: id });
      return res.json({ message: "Đã xóa vĩnh viễn công việc!", id });
    } else {
      await task.update({ isArchived: true, updatedAt: new Date() });
      if (boardId) emitBoardEvent(boardId, "task:deleted", { boardId, taskId: id });
      return res.json({ message: "Đã chuyển công việc vào kho lưu trữ!", id, isArchived: true });
    }
  } catch (error) {
    console.error("Lỗi xóa công việc:", error);
    res.status(500).json({ message: "Không thể xóa công việc!" });
  }
});

router.delete("/:id/permanent", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc!" });
    }

    const allowed = await canAccessTask(task, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền xóa công việc này!" });
    }

    const boardId = task.boardId;
    await permanentlyDeleteTask(task);
    if (boardId) emitBoardEvent(boardId, "task:deleted", { boardId, taskId: id });

    res.json({ message: "Đã xóa vĩnh viễn công việc thành công!", id });
  } catch (error) {
    console.error("Lỗi xóa vĩnh viễn công việc:", error);
    res.status(500).json({ message: "Không thể xóa vĩnh viễn công việc!" });
  }
});

module.exports = router;
