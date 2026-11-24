const express = require("express");
const { BoardColumn, Task, Board } = require("../models");
const authenticateToken = require("../middleware/auth");
const { canAccessBoard, isBoardAdmin } = require("../utils/boardAccess");
const { emitBoardEvent } = require("../socket");

const router = express.Router();
router.use(authenticateToken);

// ==================================================
// 1. POST /api/boards/:boardId/columns — Tạo cột trạng thái mới
// ==================================================
router.post("/boards/:boardId/columns", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    if (!Number.isInteger(boardId)) {
      return res.status(400).json({ message: "ID Board không hợp lệ!" });
    }

    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập không gian làm việc này!" });
    }

    const { title, color, isDone } = req.body;
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Tên cột không được để trống!" });
    }

    const existingCount = await BoardColumn.count({ where: { boardId } });

    const column = await BoardColumn.create({
      boardId,
      title: title.trim(),
      color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#64748b",
      isDone: Boolean(isDone),
      position: existingCount,
      createdAt: new Date(),
    });

    await Board.update({ updatedAt: new Date() }, { where: { id: boardId } });

    emitBoardEvent(boardId, "column:created", { boardId, column: column.toJSON() });

    res.status(201).json({
      message: "Đã tạo cột trạng thái mới!",
      column,
    });
  } catch (error) {
    console.error("Lỗi tạo cột:", error);
    res.status(500).json({ message: "Không thể tạo cột mới!" });
  }
});

// ==================================================
// 2. PUT /api/columns/:id — Sửa tên / màu / trạng thái hoàn thành của cột
// ==================================================
router.put("/columns/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const column = await BoardColumn.findByPk(id);
    if (!column) {
      return res.status(404).json({ message: "Không tìm thấy cột!" });
    }

    const allowed = await canAccessBoard(column.boardId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa cột này!" });
    }

    const { title, color, isDone } = req.body;
    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
      return res.status(400).json({ message: "Tên cột không được để trống!" });
    }

    await column.update({
      title: title !== undefined ? title.trim() : column.title,
      color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : column.color,
      isDone: isDone !== undefined ? Boolean(isDone) : column.isDone,
    });

    emitBoardEvent(column.boardId, "column:updated", {
      boardId: column.boardId,
      column: column.toJSON(),
    });

    res.json({
      message: "Đã cập nhật cột thành công!",
      column,
    });
  } catch (error) {
    console.error("Lỗi cập nhật cột:", error);
    res.status(500).json({ message: "Không thể cập nhật cột!" });
  }
});

// ==================================================
// 3. PATCH /api/boards/:boardId/columns/reorder — Sắp xếp lại thứ tự cột
// Body: { orderedColumnIds: [id1, id2, ...] }
// ==================================================
router.patch("/boards/:boardId/columns/reorder", async (req, res) => {
  try {
    const boardId = Number(req.params.boardId);
    const allowed = await canAccessBoard(boardId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Không có quyền thao tác trên bảng này!" });
    }

    const { orderedColumnIds } = req.body;
    if (!Array.isArray(orderedColumnIds) || orderedColumnIds.length === 0) {
      return res.status(400).json({ message: "Danh sách thứ tự cột không hợp lệ!" });
    }

    for (let i = 0; i < orderedColumnIds.length; i++) {
      await BoardColumn.update(
        { position: i },
        { where: { id: Number(orderedColumnIds[i]), boardId } }
      );
    }

    const columns = await BoardColumn.findAll({
      where: { boardId },
      order: [["position", "ASC"], ["id", "ASC"]],
    });

    emitBoardEvent(boardId, "column:reordered", {
      boardId,
      columns: columns.map((c) => c.toJSON()),
    });

    res.json({ message: "Đã cập nhật thứ tự cột!", columns });
  } catch (error) {
    console.error("Lỗi sắp xếp cột:", error);
    res.status(500).json({ message: "Không thể sắp xếp cột!" });
  }
});

// ==================================================
// 4. DELETE /api/columns/:id — Xóa cột (chuyển task sang cột khác nếu có)
// Query: ?moveToColumnId=...
// ==================================================
router.delete("/columns/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const column = await BoardColumn.findByPk(id);
    if (!column) {
      return res.status(404).json({ message: "Không tìm thấy cột!" });
    }

    const admin = await isBoardAdmin(column.boardId, req.user.id);
    if (!admin) {
      return res.status(403).json({ message: "Chỉ Chủ bảng hoặc Quản trị viên mới có thể xóa cột!" });
    }

    const boardId = column.boardId;
    const siblingColumns = await BoardColumn.findAll({
      where: { boardId },
      order: [["position", "ASC"], ["id", "ASC"]],
    });

    if (siblingColumns.length <= 1) {
      return res.status(400).json({ message: "Không gian làm việc cần có ít nhất 1 cột trạng thái!" });
    }

    const requestedTargetId = req.query.moveToColumnId ? Number(req.query.moveToColumnId) : null;
    const fallbackColumn =
      siblingColumns.find((c) => c.id === requestedTargetId && c.id !== id) ||
      siblingColumns.find((c) => c.id !== id);

    // Chuyển toàn bộ task trong cột sắp xóa sang cột đích an toàn
    if (fallbackColumn) {
      await Task.update(
        { columnId: fallbackColumn.id, updatedAt: new Date() },
        { where: { columnId: id } }
      );
    } else {
      await Task.update({ columnId: null }, { where: { columnId: id } });
    }

    await column.destroy();

    // Chuẩn hóa lại position cho các cột còn lại
    const remaining = await BoardColumn.findAll({
      where: { boardId },
      order: [["position", "ASC"], ["id", "ASC"]],
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        remaining[i].position = i;
        await remaining[i].save();
      }
    }

    emitBoardEvent(boardId, "column:deleted", {
      boardId,
      columnId: id,
      movedToColumnId: fallbackColumn?.id || null,
      columns: remaining.map((c) => c.toJSON()),
    });

    res.json({
      message: "Đã xóa cột và chuyển thẻ công việc an toàn!",
      id,
      movedToColumnId: fallbackColumn?.id || null,
    });
  } catch (error) {
    console.error("Lỗi xóa cột:", error);
    res.status(500).json({ message: "Không thể xóa cột!" });
  }
});

module.exports = router;
