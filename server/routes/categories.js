const express = require("express");
const { Op } = require("sequelize");
const { Category, Task } = require("../models");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// ==================================================
// CATEGORIES - GET ALL
// ==================================================
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { userId: req.user.id },
      attributes: ["id", "userId", "name", "color"],
      order: [["id", "ASC"]],
    });

    // Attach task count for each category
    const result = [];
    for (const category of categories) {
      const count = await Task.count({
        where: { categoryId: category.id, userId: req.user.id, isArchived: false },
      });
      const cat = category.toJSON();
      cat.count = count;
      result.push(cat);
    }

    res.json(result);
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh mục!" });
  }
});

// ==================================================
// CATEGORIES - POST (Create)
// ==================================================
router.post("/", async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Tên danh mục không được để trống!" });
    }

    const categoryName = name.trim();
    const categoryColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#4f46e5";

    const existing = await Category.findOne({
      where: { userId: req.user.id, name: categoryName },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Danh mục này đã tồn tại!" });
    }

    const category = await Category.create({
      userId: req.user.id,
      name: categoryName,
      color: categoryColor,
    });

    const result = category.toJSON();
    result.count = 0;

    res.status(201).json({ success: true, message: "Thêm danh mục thành công!", category: result });
  } catch (error) {
    console.error("Lỗi thêm danh mục:", error);
    res.status(500).json({ success: false, message: "Không thể thêm danh mục!" });
  }
});

// ==================================================
// CATEGORIES - PUT (Update)
// ==================================================
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: "ID danh mục không hợp lệ!" });
    }

    const { name, color } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Tên danh mục không được để trống!" });
    }

    const categoryName = name.trim();

    const category = await Category.findOne({ where: { id, userId: req.user.id } });
    if (!category) {
      return res.status(404).json({ success: false, message: "Không tìm thấy danh mục!" });
    }

    const duplicate = await Category.findOne({
      where: {
        userId: req.user.id,
        name: categoryName,
        id: { [Op.ne]: id },
      },
    });

    if (duplicate) {
      return res.status(400).json({ success: false, message: "Danh mục này đã tồn tại!" });
    }

    const updateData = { name: categoryName };
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      updateData.color = color;
    }

    await category.update(updateData);

    const count = await Task.count({
      where: { categoryId: id, userId: req.user.id, isArchived: false },
    });

    const result = category.toJSON();
    result.count = count;

    res.json({ success: true, message: "Cập nhật danh mục thành công!", category: result });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    res.status(500).json({ success: false, message: "Không thể cập nhật danh mục!" });
  }
});

// ==================================================
// CATEGORIES - DELETE
// Query param: ?moveTo=<categoryId|uncategorized>
// ==================================================
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: "ID danh mục không hợp lệ!" });
    }

    const category = await Category.findOne({ where: { id, userId: req.user.id } });
    if (!category) {
      return res.status(404).json({ success: false, message: "Không tìm thấy danh mục!" });
    }

    const taskCount = await Task.count({
      where: { categoryId: id, userId: req.user.id },
    });

    // moveTo: 'uncategorized' | <categoryId>
    const { moveTo } = req.query;

    if (taskCount > 0) {
      if (!moveTo) {
        // Return info about task count so frontend can ask user
        return res.status(400).json({
          success: false,
          message: `Danh mục này đang có ${taskCount} công việc. Vui lòng chọn cách xử lý.`,
          taskCount,
          requiresAction: true,
        });
      }

      if (moveTo === "uncategorized") {
        // Set categoryId to NULL for all tasks in this category
        await Task.update(
          { categoryId: null },
          { where: { categoryId: id, userId: req.user.id } }
        );
      } else {
        const targetId = Number(moveTo);
        if (!Number.isInteger(targetId) || targetId === id) {
          return res.status(400).json({ success: false, message: "Danh mục đích không hợp lệ!" });
        }

        const targetCategory = await Category.findOne({
          where: { id: targetId, userId: req.user.id },
        });

        if (!targetCategory) {
          return res.status(400).json({ success: false, message: "Danh mục đích không tồn tại!" });
        }

        await Task.update(
          { categoryId: targetId },
          { where: { categoryId: id, userId: req.user.id } }
        );
      }
    }

    await category.destroy();

    res.json({ success: true, message: "Xóa danh mục thành công!", id });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    res.status(500).json({ success: false, message: "Không thể xóa danh mục!" });
  }
});

module.exports = router;
