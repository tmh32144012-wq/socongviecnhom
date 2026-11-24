const {
  Task,
  TaskProgressStep,
  TaskAssignee,
  TaskComment,
  Attachment,
  TaskLabel,
  BoardLabel,
  User,
  Board,
  BoardColumn,
  Op,
} = require("../models");

const TASK_ATTRIBUTES = [
  "id",
  "userId",
  "boardId",
  "columnId",
  "position",
  "title",
  "description",
  "priority",
  "status",
  "startDate",
  "dueDate",
  "progress",
  "notes",
  "isArchived",
  "categoryId",
  "recurrence",
  "createdAt",
  "updatedAt",
  "completedAt",
  "lastModifiedById",
  "lastModifiedByName",
];

/**
 * Hydrate an array of Task instances with progressSteps, assignees, labels, creator,
 * commentCount, attachmentCount, board info, and column info in batched queries.
 */
async function hydrateTasks(tasks) {
  if (!tasks || tasks.length === 0) return [];

  const taskList = tasks.map((t) => (typeof t.toJSON === "function" ? t.toJSON() : { ...t }));
  const taskIds = taskList.map((t) => t.id);
  const creatorIds = [...new Set(taskList.map((t) => t.userId).filter(Boolean))];
  const boardIds = [...new Set(taskList.map((t) => t.boardId).filter(Boolean))];
  const columnIds = [...new Set(taskList.map((t) => t.columnId).filter(Boolean))];

  const [steps, assigneeRows, commentRows, attachmentRows, taskLabelRows, boards, columns] = await Promise.all([
    TaskProgressStep.findAll({
      where: { taskId: { [Op.in]: taskIds } },
      attributes: ["id", "taskId", "title", "completed", "stepOrder"],
      order: [["stepOrder", "ASC"], ["id", "ASC"]],
    }),
    TaskAssignee.findAll({
      where: { taskId: { [Op.in]: taskIds } },
      attributes: ["id", "taskId", "userId", "assignedAt"],
    }),
    TaskComment.findAll({
      where: { taskId: { [Op.in]: taskIds } },
      attributes: ["id", "taskId"],
    }),
    Attachment.findAll({
      where: { taskId: { [Op.in]: taskIds } },
      attributes: ["id", "taskId"],
    }),
    TaskLabel.findAll({
      where: { taskId: { [Op.in]: taskIds } },
      attributes: ["id", "taskId", "labelId"],
    }),
    boardIds.length > 0
      ? Board.findAll({
          where: { id: { [Op.in]: boardIds } },
          attributes: ["id", "name", "coverColor"],
        })
      : Promise.resolve([]),
    columnIds.length > 0
      ? BoardColumn.findAll({
          where: { id: { [Op.in]: columnIds } },
          attributes: ["id", "boardId", "title", "color", "isDone", "position"],
        })
      : Promise.resolve([]),
  ]);

  const labelIds = [...new Set(taskLabelRows.map((tl) => tl.labelId))];
  const boardLabels = labelIds.length > 0
    ? await BoardLabel.findAll({
        where: { id: { [Op.in]: labelIds } },
        attributes: ["id", "boardId", "name", "color"],
      })
    : [];
  const labelMap = new Map(boardLabels.map((l) => [l.id, l.toJSON()]));

  const labelsByTask = new Map();
  for (const tl of taskLabelRows) {
    const lb = labelMap.get(tl.labelId);
    if (!lb) continue;
    if (!labelsByTask.has(tl.taskId)) labelsByTask.set(tl.taskId, []);
    labelsByTask.get(tl.taskId).push(lb);
  }

  const assigneeUserIds = assigneeRows.map((a) => a.userId);
  const modifierUserIds = taskList.map((t) => t.lastModifiedById).filter(Boolean);
  const allUserIds = [...new Set([...creatorIds, ...assigneeUserIds, ...modifierUserIds])];

  const users = allUserIds.length > 0
    ? await User.findAll({
        where: { id: { [Op.in]: allUserIds } },
        attributes: ["id", "name", "email", "avatar"],
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u.toJSON()]));
  const boardMap = new Map(boards.map((b) => [b.id, b.toJSON()]));
  const columnMap = new Map(columns.map((c) => [c.id, c.toJSON()]));

  const stepsByTask = new Map();
  for (const s of steps) {
    const sj = s.toJSON();
    if (!stepsByTask.has(sj.taskId)) stepsByTask.set(sj.taskId, []);
    stepsByTask.get(sj.taskId).push(sj);
  }

  const assigneesByTask = new Map();
  for (const a of assigneeRows) {
    const userObj = userMap.get(a.userId);
    if (!userObj) continue;
    if (!assigneesByTask.has(a.taskId)) assigneesByTask.set(a.taskId, []);
    assigneesByTask.get(a.taskId).push({
      ...userObj,
      assignedAt: a.assignedAt,
    });
  }

  const commentCountByTask = new Map();
  for (const c of commentRows) {
    commentCountByTask.set(c.taskId, (commentCountByTask.get(c.taskId) || 0) + 1);
  }

  const attachmentCountByTask = new Map();
  for (const att of attachmentRows) {
    attachmentCountByTask.set(att.taskId, (attachmentCountByTask.get(att.taskId) || 0) + 1);
  }

  return taskList.map((t) => {
    const creatorObj = userMap.get(t.userId) || null;
    const modifierObj =
      (t.lastModifiedById ? userMap.get(t.lastModifiedById) : null) ||
      (t.lastModifiedByName
        ? { id: t.lastModifiedById || null, name: t.lastModifiedByName }
        : creatorObj);

    return {
      ...t,
      recurrence: t.recurrence || "none",
      progressSteps: stepsByTask.get(t.id) || [],
      assignees: assigneesByTask.get(t.id) || [],
      labels: labelsByTask.get(t.id) || [],
      creator: creatorObj,
      lastModifiedBy: modifierObj,
      lastModifiedByName: modifierObj?.name || t.lastModifiedByName || creatorObj?.name || null,
      commentCount: commentCountByTask.get(t.id) || 0,
      attachmentCount: attachmentCountByTask.get(t.id) || 0,
      board: t.boardId ? boardMap.get(t.boardId) || null : null,
      column: t.columnId ? columnMap.get(t.columnId) || null : null,
    };
  });
}

async function hydrateSingleTask(taskId) {
  const task = await Task.findByPk(taskId, { attributes: TASK_ATTRIBUTES });
  if (!task) return null;
  const [hydrated] = await hydrateTasks([task]);
  return hydrated;
}

module.exports = {
  TASK_ATTRIBUTES,
  hydrateTasks,
  hydrateSingleTask,
};
