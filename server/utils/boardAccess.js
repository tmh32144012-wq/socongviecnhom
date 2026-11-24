const { Board, BoardMember, Task, Op } = require("../models");

/**
 * Lấy bản ghi thành viên đã chấp nhận trong Board
 */
async function getAcceptedMembership(boardId, userId) {
  if (!boardId || !userId) return null;
  return BoardMember.findOne({
    where: {
      boardId: Number(boardId),
      userId: Number(userId),
      status: "accepted",
    },
  });
}

/**
 * Kiểm tra user có quyền truy cập Board không (là thành viên đã chấp nhận)
 */
async function canAccessBoard(boardId, userId) {
  const membership = await getAcceptedMembership(boardId, userId);
  return Boolean(membership);
}

/**
 * Kiểm tra user có quyền quản trị Board không (owner hoặc admin)
 */
async function isBoardAdmin(boardId, userId) {
  const membership = await getAcceptedMembership(boardId, userId);
  return Boolean(membership && (membership.role === "owner" || membership.role === "admin"));
}

/**
 * Kiểm tra user có phải chủ sở hữu Board không
 */
async function isBoardOwner(boardId, userId) {
  const membership = await getAcceptedMembership(boardId, userId);
  return Boolean(membership && membership.role === "owner");
}

/**
 * Lấy danh sách tất cả boardId mà user là thành viên (đã chấp nhận)
 */
async function getUserBoardIds(userId) {
  const memberships = await BoardMember.findAll({
    where: {
      userId: Number(userId),
      status: "accepted",
    },
    attributes: ["boardId"],
  });
  return memberships.map((m) => m.boardId);
}

/**
 * Kiểm tra user có quyền xem/thao tác với 1 Task cụ thể hay không
 * - Nếu task thuộc Board: user phải là thành viên đã chấp nhận của Board đó
 * - Nếu task cá nhân (boardId === null): user phải là chủ sở hữu (userId)
 */
async function canAccessTask(task, userId) {
  if (!task || !userId) return false;
  if (task.boardId) {
    return canAccessBoard(task.boardId, userId);
  }
  return Number(task.userId) === Number(userId);
}

/**
 * Xây dựng điều kiện WHERE cho các Task user được phép xem
 */
async function buildAccessibleTasksWhere(userId, extraWhere = {}) {
  const boardIds = await getUserBoardIds(userId);
  const accessCondition = boardIds.length > 0
    ? {
        [Op.or]: [
          { userId: Number(userId), boardId: null },
          { boardId: { [Op.in]: boardIds } },
        ],
      }
    : { userId: Number(userId), boardId: null };

  return {
    ...accessCondition,
    ...extraWhere,
  };
}

module.exports = {
  getAcceptedMembership,
  canAccessBoard,
  isBoardAdmin,
  isBoardOwner,
  getUserBoardIds,
  canAccessTask,
  buildAccessibleTasksWhere,
};
