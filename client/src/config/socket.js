import { io } from "socket.io-client";
import { getToken } from "./api";

let socket = null;

export function connectSocket() {
  const token = getToken();
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1200,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinBoardRoom(boardId) {
  if (socket && boardId) {
    socket.emit("board:join", Number(boardId));
  }
}

export function leaveBoardRoom(boardId) {
  if (socket && boardId) {
    socket.emit("board:leave", Number(boardId));
  }
}
