const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config/jwt");
const { canAccessBoard } = require("./utils/boardAccess");
const { corsOptions } = require("./utils/corsConfig");

let ioInstance = null;

function initSocket(httpServer) {
  const { Server } = require("socket.io");

  ioInstance = new Server(httpServer, {
    cors: corsOptions,
  });

  // Xác thực JWT + kiểm tra tokenVersion khi kết nối Socket.io
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

      if (!token) {
        return next(new Error("Thiếu token xác thực Socket"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const { User } = require("./models");
      const user = await User.findByPk(decoded.id, {
        attributes: ["id", "email", "tokenVersion"],
      });

      if (!user) {
        return next(new Error("Tài khoản không tồn tại"));
      }

      const tokenTv = typeof decoded.tv === "number" ? decoded.tv : 0;
      const currentTv = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
      if (tokenTv !== currentTv) {
        return next(new Error("Phiên Socket đã bị thu hồi"));
      }

      socket.user = { id: user.id, email: user.email };
      next();
    } catch (err) {
      next(new Error("Token Socket không hợp lệ"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("board:join", async (boardId) => {
      try {
        const numericId = Number(boardId);
        if (!Number.isInteger(numericId)) return;

        const allowed = await canAccessBoard(numericId, userId);
        if (!allowed) return;

        for (const room of socket.rooms) {
          if (room.startsWith("board:") && room !== `board:${numericId}`) {
            socket.leave(room);
          }
        }
        socket.join(`board:${numericId}`);
        socket.emit("board:joined", { boardId: numericId });
      } catch (err) {
        console.error("Socket board:join error:", err.message);
      }
    });

    socket.on("board:leave", (boardId) => {
      const numericId = Number(boardId);
      if (Number.isInteger(numericId)) {
        socket.leave(`board:${numericId}`);
      }
    });

    socket.on("disconnect", () => {});
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function emitBoardEvent(boardId, eventName, payload) {
  if (!ioInstance || !boardId) return;
  ioInstance.to(`board:${boardId}`).emit(eventName, payload);
}

function emitUserEvent(userId, eventName, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(eventName, payload);
}

module.exports = {
  initSocket,
  getIO,
  emitBoardEvent,
  emitUserEvent,
};
