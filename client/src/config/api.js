/**
 * API CONFIGURATION & CLIENT
 * Quản lý endpoint tập trung cho toàn bộ frontend
 */

export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export const getToken = () => localStorage.getItem("token");

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

export const API_ENDPOINTS = {
  // Auth & Session Security
  login: `${API_BASE}/login`,
  register: `${API_BASE}/register`,
  captcha: `${API_BASE}/captcha`,
  forgotPassword: `${API_BASE}/forgot-password`,
  resetPassword: `${API_BASE}/reset-password`,
  logoutAll: `${API_BASE}/logout-all`,
  me: `${API_BASE}/me`,
  profile: `${API_BASE}/profile`,
  changePassword: `${API_BASE}/change-password`,
  avatar: `${API_BASE}/avatar`,
  account: `${API_BASE}/account`,

  // Boards & Team Members
  boards: `${API_BASE}/boards`,
  boardById: (boardId) => `${API_BASE}/boards/${boardId}`,
  boardMembers: (boardId) => `${API_BASE}/boards/${boardId}/members`,
  boardMemberById: (boardId, memberId) => `${API_BASE}/boards/${boardId}/members/${memberId}`,
  boardSearchUsers: (boardId, q = "") =>
    `${API_BASE}/boards/${boardId}/search-users?q=${encodeURIComponent(q)}`,
  boardRespondInvite: (boardId) => `${API_BASE}/boards/${boardId}/invitations/respond`,

  // Collaboration: Activity Logs, Shared Board Labels, Group Chat
  boardActivities: (boardId, page = 1, limit = 30) =>
    `${API_BASE}/boards/${boardId}/activities?page=${page}&limit=${limit}`,
  taskActivities: (taskId) => `${API_BASE}/tasks/${taskId}/activities`,
  boardLabels: (boardId) => `${API_BASE}/boards/${boardId}/labels`,
  labelById: (labelId) => `${API_BASE}/labels/${labelId}`,
  taskLabels: (taskId) => `${API_BASE}/tasks/${taskId}/labels`,
  boardMessages: (boardId, limit = 50) => `${API_BASE}/boards/${boardId}/messages?limit=${limit}`,

  // Dynamic Kanban Columns
  boardColumns: (boardId) => `${API_BASE}/boards/${boardId}/columns`,
  boardColumnsReorder: (boardId) => `${API_BASE}/boards/${boardId}/columns/reorder`,
  columnById: (columnId) => `${API_BASE}/columns/${columnId}`,

  // Tasks
  tasks: `${API_BASE}/tasks`,
  taskById: (id) => `${API_BASE}/tasks/${id}`,
  taskMove: (id) => `${API_BASE}/tasks/${id}/move`,
  taskAssignees: (id) => `${API_BASE}/tasks/${id}/assignees`,
  taskArchive: (id) => `${API_BASE}/tasks/${id}/archive`,
  taskRestore: (id) => `${API_BASE}/tasks/${id}/restore`,
  taskPermanent: (id) => `${API_BASE}/tasks/${id}/permanent`,
  archivedTasks: `${API_BASE}/tasks/archived`,
  taskSteps: (taskId, stepId) => `${API_BASE}/tasks/${taskId}/steps/${stepId}`,

  // Comments
  taskComments: (taskId) => `${API_BASE}/tasks/${taskId}/comments`,
  commentById: (commentId) => `${API_BASE}/comments/${commentId}`,

  // Categories
  categories: `${API_BASE}/categories`,
  categoryById: (id) => `${API_BASE}/categories/${id}`,

  // Notifications
  notifications: `${API_BASE}/notifications`,
  notificationRead: (id) => `${API_BASE}/notifications/${id}/read`,
  notificationsReadAll: `${API_BASE}/notifications/read-all`,
  notificationDelete: (id) => `${API_BASE}/notifications/${id}`,
  notificationsClearAll: `${API_BASE}/notifications/clear/all`,
  checkReminders: `${API_BASE}/notifications/check-reminders`,

  // Stats
  stats: `${API_BASE}/stats`,

  // AI
  aiStatus: `${API_BASE}/ai/status`,
  aiChat: `${API_BASE}/ai/chat`,
  aiConfig: `${API_BASE}/ai/config`,

  // Attachments
  taskAttachments: (taskId) => `${API_BASE}/tasks/${taskId}/attachments`,
  attachmentDownload: (id) => `${API_BASE}/attachments/${id}/download`,
  attachmentDelete: (id) => `${API_BASE}/attachments/${id}`,
};

export async function apiFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers || {});
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  return fetch(url, { ...options, headers });
}

export default API_BASE;
