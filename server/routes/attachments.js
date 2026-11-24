const express = require("express");
const fs = require("fs");
const multer = require("multer");
const authenticateToken = require("../middleware/auth");
const { upload, MAX_FILE_SIZE } = require("../middleware/upload");
const { Task, Attachment } = require("../models");
const { canAccessTask, isBoardAdmin } = require("../utils/boardAccess");
const { emitBoardEvent } = require("../socket");

const router = express.Router();
router.use(authenticateToken);

// 1. POST /api/tasks/:taskId/attachments — Upload tệp đính kèm (cá nhân & nhóm)
router.post("/tasks/:taskId/attachments", (req, res) => {
  const uploadMiddleware = upload.array("files", 5);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: `Kích thước tệp quá lớn! Giới hạn tối đa là ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            message: "Mỗi lần chỉ được tải lên tối đa 5 tệp tin!",
          });
        }
        return res.status(400).json({ message: `Lỗi tải tệp: ${err.message}` });
      }
      return res.status(400).json({ message: err.message || "Tệp tin không hợp lệ!" });
    }

    try {
      const taskId = parseInt(req.params.taskId, 10);
      const userId = req.user.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Vui lòng chọn ít nhất một tệp tin!" });
      }

      const task = await Task.findByPk(taskId);
      const allowed = task ? await canAccessTask(task, userId) : false;

      if (!task || !allowed) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
          }
        }
        return res.status(404).json({ message: "Không tìm thấy công việc hoặc bạn không có quyền!" });
      }

      const createdAttachments = [];
      for (const file of req.files) {
        const attachment = await Attachment.create({
          taskId,
          userId,
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype || "application/octet-stream",
          fileSize: file.size,
          filePath: file.path,
          createdAt: new Date(),
        });
        createdAttachments.push(attachment);
      }

      if (task.boardId) {
        emitBoardEvent(task.boardId, "attachment:updated", { boardId: task.boardId, taskId });
      }

      return res.status(201).json({
        message: `Đã đính kèm thành công ${createdAttachments.length} tệp tin!`,
        attachments: createdAttachments,
      });
    } catch (dbError) {
      console.error("Lỗi lưu attachment:", dbError);
      if (req.files) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
          }
        }
      }
      return res.status(500).json({ message: "Lỗi hệ thống khi lưu tệp đính kèm!" });
    }
  });
});

// 2. GET /api/tasks/:taskId/attachments — Lấy danh sách tệp đính kèm
router.get("/tasks/:taskId/attachments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const task = await Task.findByPk(taskId);
    const allowed = task ? await canAccessTask(task, req.user.id) : false;

    if (!task || !allowed) {
      return res.status(404).json({ message: "Không tìm thấy công việc tương ứng!" });
    }

    const attachments = await Attachment.findAll({
      where: { taskId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "taskId",
        "userId",
        "fileName",
        "originalName",
        "mimeType",
        "fileSize",
        "createdAt",
      ],
    });

    return res.json({ attachments });
  } catch (error) {
    console.error("Lỗi lấy danh sách attachments:", error);
    return res.status(500).json({ message: "Không thể lấy danh sách tệp đính kèm!" });
  }
});

// 3. GET /api/attachments/:id/download — Tải về tệp đính kèm
router.get("/attachments/:id/download", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const attachment = await Attachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({ message: "Không tìm thấy tệp đính kèm!" });
    }

    const task = await Task.findByPk(attachment.taskId);
    const allowed = task ? await canAccessTask(task, req.user.id) : Number(attachment.userId) === Number(req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: "Bạn không có quyền tải tệp này!" });
    }

    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ message: "Tệp tin vật lý không tồn tại trên máy chủ!" });
    }

    return res.download(attachment.filePath, attachment.originalName);
  } catch (error) {
    console.error("Lỗi tải tệp:", error);
    return res.status(500).json({ message: "Không thể tải tệp tin về!" });
  }
});

// 4. DELETE /api/attachments/:id — Xóa tệp đính kèm
router.delete("/attachments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const attachment = await Attachment.findByPk(id);
    if (!attachment) {
      return res.status(404).json({ message: "Không tìm thấy tệp đính kèm!" });
    }

    const task = await Task.findByPk(attachment.taskId);
    const isUploader = Number(attachment.userId) === Number(req.user.id);
    const isAdmin = task?.boardId ? await isBoardAdmin(task.boardId, req.user.id) : false;

    if (!isUploader && !isAdmin) {
      return res.status(403).json({ message: "Bạn không có quyền xóa tệp này!" });
    }

    if (fs.existsSync(attachment.filePath)) {
      try { fs.unlinkSync(attachment.filePath); } catch (fileErr) { /* ignore */ }
    }

    await attachment.destroy();

    if (task?.boardId) {
      emitBoardEvent(task.boardId, "attachment:updated", {
        boardId: task.boardId,
        taskId: task.id,
      });
    }

    return res.json({ message: "Đã xóa tệp đính kèm thành công!", id });
  } catch (error) {
    console.error("Lỗi xóa attachment:", error);
    return res.status(500).json({ message: "Không thể xóa tệp đính kèm!" });
  }
});

module.exports = router;
