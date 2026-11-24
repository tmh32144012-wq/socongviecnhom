import { useEffect, useCallback } from "react";

const VALID_SIMPLE_PAGES = new Set([
  "boards",
  "dashboard",
  "myday",
  "tasks",
  "calendar",
  "statistics",
  "categories",
  "archive",
  "notifications",
  "ai",
  "settings",
]);

/**
 * Phân tích URL hiện tại thành { page, boardId, taskId }
 * Hỗ trợ Deep Link: /boards/2, /tasks/15, /dashboard, /myday...
 */
export function parseAppRoute(pathname = window.location.pathname) {
  const clean = (pathname || "/").replace(/\/+$/, "") || "/";
  if (clean === "/") return { page: "boards", boardId: null, taskId: null };

  const boardMatch = clean.match(/^\/boards\/(\d+)$/);
  if (boardMatch) {
    return { page: "kanban", boardId: Number(boardMatch[1]), taskId: null };
  }

  const taskMatch = clean.match(/^\/tasks\/(\d+)$/);
  if (taskMatch) {
    return { page: "detail", boardId: null, taskId: Number(taskMatch[1]) };
  }

  const segment = clean.slice(1);
  if (VALID_SIMPLE_PAGES.has(segment)) {
    return { page: segment, boardId: null, taskId: null };
  }

  return { page: "boards", boardId: null, taskId: null };
}

/**
 * Custom Hook đồng bộ hóa điều hướng URL thật (History API) với state trang
 * Cho phép bấm Back/Forward trình duyệt, F5 giữ đúng vị trí và chia sẻ link thẻ công việc
 */
export function useUrlRouter({
  isAuthenticated,
  currentPage,
  activeBoardId,
  selectedTaskId,
  onRouteChange,
}) {
  // Đẩy URL mới mỗi khi state trang thay đổi
  useEffect(() => {
    if (!isAuthenticated) return;

    let targetPath = "/boards";
    if (currentPage === "kanban" && activeBoardId) {
      targetPath = `/boards/${activeBoardId}`;
    } else if (currentPage === "detail" && selectedTaskId) {
      targetPath = `/tasks/${selectedTaskId}`;
    } else if (VALID_SIMPLE_PAGES.has(currentPage)) {
      targetPath = `/${currentPage}`;
    } else if (currentPage === "status") {
      targetPath = "/tasks";
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: currentPage, activeBoardId, selectedTaskId }, "", targetPath);
    }
  }, [isAuthenticated, currentPage, activeBoardId, selectedTaskId]);

  // Lắng nghe nút Back / Forward của trình duyệt
  const handlePopState = useCallback(() => {
    if (!isAuthenticated) return;
    const parsed = parseAppRoute(window.location.pathname);
    onRouteChange?.(parsed);
  }, [isAuthenticated, onRouteChange]);

  useEffect(() => {
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handlePopState]);
}
