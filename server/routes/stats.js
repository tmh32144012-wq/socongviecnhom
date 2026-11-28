const express = require("express");
const { Task, Category, TaskAssignee, User, Op } = require("../models");
const authenticateToken = require("../middleware/auth");
const { buildAccessibleTasksWhere, canAccessBoard } = require("../utils/boardAccess");

const router = express.Router();
router.use(authenticateToken);

// GET /api/stats — Overview statistics (hỗ trợ cả việc nhóm & lọc ?boardId=...)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || "all";
    const boardIdParam = req.query.boardId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateFilter = {};
    if (period === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = {
        [Op.or]: [
          { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } },
          { updatedAt: { [Op.gte]: today, [Op.lt]: tomorrow } },
        ],
      };
    } else if (period === "7days") {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateFilter = {
        [Op.or]: [
          { createdAt: { [Op.gte]: sevenDaysAgo } },
          { updatedAt: { [Op.gte]: sevenDaysAgo } },
        ],
      };
    } else if (period === "30days") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = {
        [Op.or]: [
          { createdAt: { [Op.gte]: thirtyDaysAgo } },
          { updatedAt: { [Op.gte]: thirtyDaysAgo } },
        ],
      };
    } else if (period === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFilter = {
        [Op.or]: [
          { createdAt: { [Op.gte]: startOfMonth } },
          { updatedAt: { [Op.gte]: startOfMonth } },
        ],
      };
    } else if (period === "year") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      dateFilter = {
        [Op.or]: [
          { createdAt: { [Op.gte]: startOfYear } },
          { updatedAt: { [Op.gte]: startOfYear } },
        ],
      };
    }

    let baseWhere;
    if (boardIdParam && boardIdParam !== "all") {
      const bid = Number(boardIdParam);
      if (Number.isInteger(bid) && (await canAccessBoard(bid, userId))) {
        baseWhere = { boardId: bid, isArchived: false };
      } else {
        baseWhere = { userId, boardId: null, isArchived: false };
      }
    } else {
      baseWhere = await buildAccessibleTasksWhere(userId, { isArchived: false });
    }

    const archivedWhere = await buildAccessibleTasksWhere(userId, { isArchived: true });
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // Chạy song song 4 truy vấn SQL độc lập (Promise.all) để giảm mạnh độ trễ TTFB
    const [tasks, archivedCount, categories, allRecentTasks] = await Promise.all([
      Task.findAll({
        where: { [Op.and]: [baseWhere, dateFilter] },
        attributes: [
          "id", "title", "status", "priority", "startDate",
          "dueDate", "progress", "categoryId", "boardId", "createdAt", "updatedAt",
        ],
      }),
      Task.count({ where: archivedWhere }),
      Category.findAll({
        where: { userId },
        attributes: ["id", "name", "color"],
      }),
      Task.findAll({
        where: {
          [Op.and]: [
            baseWhere,
            { status: "Hoàn thành", updatedAt: { [Op.gte]: thirtyDaysAgo } },
          ],
        },
        attributes: ["id", "updatedAt"],
      }),
    ]);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    let completedCount = 0;
    let inProgressCount = 0;
    let waitingCount = 0;
    let notStartedCount = 0;
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let urgentCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalProgress = 0;

    for (const task of tasks) {
      totalProgress += task.progress || 0;

      const isCompleted = task.status === "Hoàn thành" || task.progress === 100;
      let isOverdue = false;

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);

        if (!isCompleted && due < today) {
          isOverdue = true;
          overdueCount++;
        }

        if (due.getTime() === today.getTime()) todayCount++;
        else if (due > today && due <= sevenDaysLater) upcomingCount++;
      }

      if (isCompleted) {
        completedCount++;
      } else if (isOverdue) {
        // counted
      } else if (task.status === "Đang chờ") {
        waitingCount++;
      } else if (
        task.status === "Đang thực hiện" ||
        task.status === "Đang làm" ||
        (task.progress > 0 && task.progress < 100)
      ) {
        inProgressCount++;
      } else {
        notStartedCount++;
      }

      if (task.priority === "Khẩn cấp") urgentCount++;
      else if (task.priority === "Cao") highCount++;
      else if (task.priority === "Thấp") lowCount++;
      else mediumCount++;
    }

    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const averageProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

    const categoryStats = categories.map((cat) => {
      const catTasks = tasks.filter((t) => t.categoryId === cat.id);
      const catCompleted = catTasks.filter(
        (t) => t.status === "Hoàn thành" || t.progress === 100
      ).length;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color || "#0f766e",
        total: catTasks.length,
        completed: catCompleted,
        rate: catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0,
      };
    });

    const uncatTasks = tasks.filter((t) => !t.categoryId);
    if (uncatTasks.length > 0) {
      const uncatCompleted = uncatTasks.filter(
        (t) => t.status === "Hoàn thành" || t.progress === 100
      ).length;
      categoryStats.push({
        id: 0,
        name: "Chưa phân loại",
        color: "#78716c",
        total: uncatTasks.length,
        completed: uncatCompleted,
        rate: Math.round((uncatCompleted / uncatTasks.length) * 100),
      });
    }

    const completedByDay = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      completedByDay[key] = 0;
    }

    for (const task of allRecentTasks) {
      const d = new Date(task.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (completedByDay[key] !== undefined) {
        completedByDay[key]++;
      }
    }

    const lineChartData = Object.entries(completedByDay).map(([date, count]) => ({
      date,
      count,
    }));

    // ==================================================
    // TEAM WORKLOAD (PHÂN BỔ KHỐI LƯỢNG CÔNG VIỆC THEO THÀNH VIÊN)
    // ==================================================
    const taskIds = tasks.map((t) => t.id);
    const taskAssignees = taskIds.length
      ? await TaskAssignee.findAll({
          where: { taskId: { [Op.in]: taskIds } },
          attributes: ["taskId", "userId"],
        })
      : [];

    const assigneesByTask = new Map();
    const involvedUserIds = new Set();
    for (const ta of taskAssignees) {
      involvedUserIds.add(ta.userId);
      if (!assigneesByTask.has(ta.taskId)) assigneesByTask.set(ta.taskId, []);
      assigneesByTask.get(ta.taskId).push(ta.userId);
    }

    const workloadUsers = involvedUserIds.size
      ? await User.findAll({
          where: { id: { [Op.in]: [...involvedUserIds] } },
          attributes: ["id", "name", "email", "avatar"],
        })
      : [];
    const userLookup = new Map(workloadUsers.map((u) => [u.id, u.toJSON()]));

    const memberMap = new Map();
    let unassignedActive = 0;
    let unassignedTotal = 0;

    for (const task of tasks) {
      const isCompleted = task.status === "Hoàn thành" || task.progress === 100;
      const isOverdue = (() => {
        if (!task.dueDate || isCompleted) return false;
        const d = new Date(task.dueDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      })();
      const isUrgent = !isCompleted && (task.priority === "Khẩn cấp" || task.priority === "Cao");
      const assignedIds = assigneesByTask.get(task.id) || [];

      if (assignedIds.length === 0) {
        unassignedTotal++;
        if (!isCompleted) unassignedActive++;
        continue;
      }

      for (const uid of assignedIds) {
        if (!memberMap.has(uid)) {
          const u = userLookup.get(uid) || { id: uid, name: "Thành viên", email: "", avatar: null };
          memberMap.set(uid, {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            total: 0,
            active: 0,
            completed: 0,
            overdue: 0,
            urgent: 0,
          });
        }
        const entry = memberMap.get(uid);
        entry.total++;
        if (isCompleted) entry.completed++;
        else entry.active++;
        if (isOverdue) entry.overdue++;
        if (isUrgent) entry.urgent++;
      }
    }

    const byMember = [...memberMap.values()]
      .map((m) => ({
        ...m,
        completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
        loadLevel:
          m.active >= 5 || m.overdue >= 2
            ? "overloaded"
            : m.active >= 3
            ? "busy"
            : "balanced",
      }))
      .sort((a, b) => b.active - a.active || b.total - a.total);

    res.json({
      overview: {
        totalTasks,
        completedCount,
        inProgressCount,
        waitingCount,
        notStartedCount,
        overdueCount,
        todayCount,
        upcomingCount,
        urgentCount,
        highPriorityCount: urgentCount + highCount,
        archivedCount,
        completionRate,
        averageProgress,
      },
      byStatus: {
        completed: completedCount,
        inProgress: inProgressCount,
        waiting: waitingCount,
        notStarted: notStartedCount,
        overdue: overdueCount,
      },
      byPriority: {
        urgent: urgentCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      byCategory: categoryStats,
      byMember,
      unassignedStats: { total: unassignedTotal, active: unassignedActive },
      lineChart: lineChartData,
      period,
    });
  } catch (error) {
    console.error("Lỗi thống kê:", error);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu thống kê!" });
  }
});

module.exports = router;
