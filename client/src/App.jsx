import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Menu, Search, X, Plus, Bell } from "lucide-react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import ThemeQuickMenu from "./components/ThemeQuickMenu";
import Toast from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import TaskFormModal from "./components/TaskFormModal";
import UserAvatar from "./components/UserAvatar";
import { API_ENDPOINTS, getAuthHeaders } from "./config/api";
import {
  connectSocket,
  disconnectSocket,
  joinBoardRoom,
  leaveBoardRoom,
} from "./config/socket";
import { parseAppRoute, useUrlRouter } from "./hooks/useUrlRouter";

// Code-splitting theo từng trang (React.lazy) — cắt giảm mạnh kích thước bundle khởi tạo
const Boards = lazy(() => import("./components/Boards"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const Tasks = lazy(() => import("./components/Tasks"));
const TaskDetail = lazy(() => import("./components/TaskDetail"));
const Categories = lazy(() => import("./components/Categories"));
const Settings = lazy(() => import("./components/Settings"));
const TaskStatus = lazy(() => import("./components/TaskStatus"));
const Notifications = lazy(() => import("./components/Notifications"));
const Statistics = lazy(() => import("./components/Statistics"));
const Archive = lazy(() => import("./components/Archive"));
const CalendarPage = lazy(() => import("./components/CalendarPage"));
const AI = lazy(() => import("./AI"));
const MyDay = lazy(() => import("./components/MyDay"));
const Kanban = lazy(() => import("./components/Kanban"));
const Login = lazy(() => import("./Login"));
const Register = lazy(() => import("./Register"));
const WelcomeShowcase = lazy(() => import("./components/WelcomeShowcase"));

function PageLazyFallback() {
  return (
    <div className="page-lazy-loader" role="status" aria-live="polite">
      <div className="page-lazy-spinner" aria-hidden="true" />
      <span>Đang tải giao diện...</span>
    </div>
  );
}

function App() {
  // ==================================================
  // 1. AUTHENTICATION & SESSION
  // ==================================================
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });
  const [authPage, setAuthPage] = useState(() =>
    sessionStorage.getItem("skippedIntro") === "true" ? "login" : "intro"
  );

  const getToken = () => localStorage.getItem("token");

  // ==================================================
  // 2. TOAST & CONFIRM MODAL
  // ==================================================
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = "info", title = "") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Đồng ý",
    cancelText: "Hủy bỏ",
    secondaryText: null,
    isDanger: false,
    onConfirm: null,
    onSecondary: null,
    onCancel: null,
  });

  const askConfirm = ({
    title,
    message,
    confirmText,
    cancelText,
    secondaryText = null,
    isDanger = false,
    onConfirm,
    onSecondary = null,
    onCancel = null,
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      secondaryText,
      isDanger,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) await onConfirm();
      },
      onSecondary: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (onSecondary) await onSecondary();
      },
      onCancel: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      },
    });
  };

  // ==================================================
  // 3. CORE APP & TEAM BOARD STATE
  // ==================================================
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const initialRoute = parseAppRoute();
  const [currentPage, setCurrentPage] = useState(initialRoute.page === "detail" ? "boards" : initialRoute.page);

  // Xử lý callback đăng nhập Google / Facebook OAuth 2.0 (?oauth_code=... hoặc ?oauth_error=...)
  const oauthHandledRef = useRef(false);
  useEffect(() => {
    if (oauthHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get("oauth_code");
    const oauthError = params.get("oauth_error");
    if (!oauthCode && !oauthError) return;

    oauthHandledRef.current = true;
    window.history.replaceState({}, "", window.location.pathname || "/");

    if (oauthError) {
      sessionStorage.setItem("skippedIntro", "true");
      setAuthPage("login");
      const errorMap = {
        GOOGLE_NOT_CONFIGURED: "Chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trong server/.env.",
        FACEBOOK_NOT_CONFIGURED: "Chưa cấu hình FACEBOOK_APP_ID / FACEBOOK_APP_SECRET trong server/.env.",
        GOOGLE_CANCELLED: "Bạn đã hủy đăng nhập bằng Google.",
        FACEBOOK_CANCELLED: "Bạn đã hủy đăng nhập bằng Facebook.",
      };
      showToast(errorMap[oauthError] || "Đăng nhập mạng xã hội thất bại. Vui lòng thử lại!", "error");
      return;
    }

    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.oauthExchange, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: oauthCode }),
        });
        const data = await res.json();
        if (!res.ok || !data.token || !data.user) {
          throw new Error(data.message || "Không thể hoàn tất đăng nhập mạng xã hội!");
        }
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setCurrentPage("boards");
        showToast(data.message || "Đăng nhập thành công!", "success");
      } catch (err) {
        sessionStorage.setItem("skippedIntro", "true");
        setAuthPage("login");
        showToast(err.message || "Đăng nhập mạng xã hội không thành công!", "error");
      }
    })();
  }, [showToast]);
  const [previousPage, setPreviousPage] = useState("boards");
  const [statusPage, setStatusPage] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");

  const [boards, setBoards] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState(() => {
    if (initialRoute.boardId) return initialRoute.boardId;
    const saved = localStorage.getItem("activeBoardId");
    return saved ? Number(saved) : null;
  });
  const [activeBoardData, setActiveBoardData] = useState(null);
  const [loadingBoardData, setLoadingBoardData] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Trung bình",
    status: "Chưa bắt đầu",
    startDate: "",
    dueDate: "",
    categoryId: "",
    notes: "",
    boardId: null,
    columnId: null,
    assigneeIds: [],
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Ctrl+K / Cmd+K quick focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setSearchFocused(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeBoardIdRef = useRef(activeBoardId);
  activeBoardIdRef.current = activeBoardId;

  const handleLogout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("activeBoardId");
    setCurrentUser(null);
    setBoards([]);
    setPendingInvitations([]);
    setActiveBoardId(null);
    setActiveBoardData(null);
    setTasks([]);
    setCategories([]);
    setCategoryFilter("Tất cả");
    setNotifications([]);
    setUnreadCount(0);
    setSocketConnected(false);
    setAuthPage("login");
  }, []);

  // Revalidate auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setCurrentUser(null);
        return;
      }
      try {
        const res = await fetch(API_ENDPOINTS.me, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error("Lỗi xác thực người dùng:", err);
      }
    };
    checkAuth();
  }, [handleLogout]);

  const handleLogin = (user) => {
    localStorage.setItem("currentUser", JSON.stringify(user));
    setCurrentUser(user);
    setCurrentPage("boards");
    showToast(`Chào mừng trở lại, ${user.name || "bạn"}!`, "success", "Đăng nhập thành công");
  };

  const handleRegister = () => {
    setAuthPage("login");
    showToast("Đăng ký tài khoản thành công! Vui lòng đăng nhập.", "success");
  };

  // ==================================================
  // 4. API FETCHERS
  // ==================================================
  const fetchBoards = useCallback(async () => {
    try {
      setLoadingBoards(true);
      if (!getToken()) return [];
      const res = await fetch(API_ENDPOINTS.boards, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Không thể tải không gian làm việc");
      const data = await res.json();
      const loadedBoards = data.boards || [];
      setBoards(loadedBoards);
      setPendingInvitations(data.pendingInvitations || []);

      // Chọn bảng mặc định nếu chưa chọn hoặc bảng cũ không còn
      setActiveBoardId((prevId) => {
        if (prevId && loadedBoards.some((b) => Number(b.id) === Number(prevId))) {
          return prevId;
        }
        const firstId = loadedBoards[0]?.id || null;
        if (firstId) localStorage.setItem("activeBoardId", String(firstId));
        return firstId;
      });
      return loadedBoards;
    } catch (err) {
      console.error("Lỗi lấy danh sách boards:", err);
      return [];
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  const fetchBoardDetail = useCallback(async (boardId, silent = false) => {
    if (!boardId || !getToken()) {
      setActiveBoardData(null);
      return null;
    }
    try {
      if (!silent) setLoadingBoardData(true);
      const res = await fetch(API_ENDPOINTS.boardById(boardId), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setActiveBoardData(null);
        return null;
      }
      const data = await res.json();
      setActiveBoardData(data);
      return data;
    } catch (err) {
      console.error("Lỗi lấy chi tiết board:", err);
      return null;
    } finally {
      if (!silent) setLoadingBoardData(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      if (!getToken()) return [];
      const res = await fetch(API_ENDPOINTS.tasks, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Không thể lấy công việc");
      const data = await res.json();
      setTasks(data);
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh sách công việc:", error);
      return [];
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      if (!getToken()) return [];
      const res = await fetch(API_ENDPOINTS.categories, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Không thể lấy danh mục");
      const data = await res.json();
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
      return [];
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!getToken()) return;
      const res = await fetch(API_ENDPOINTS.notifications, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
    }
  }, []);

  const checkReminders = useCallback(async () => {
    try {
      if (!getToken()) return;
      await fetch(API_ENDPOINTS.checkReminders, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Lỗi quét lời nhắc:", error);
    }
  }, [fetchNotifications]);

  // Initial data load when logged in
  useEffect(() => {
    if (currentUser) {
      fetchBoards();
      fetchTasks();
      fetchCategories();
      fetchNotifications();
      checkReminders();

      const timer = setInterval(() => {
        checkReminders();
      }, 5 * 60 * 1000);

      return () => clearInterval(timer);
    }
  }, [currentUser, fetchBoards, fetchTasks, fetchCategories, fetchNotifications, checkReminders]);

  // Load detail when activeBoardId changes
  useEffect(() => {
    if (currentUser && activeBoardId) {
      localStorage.setItem("activeBoardId", String(activeBoardId));
      fetchBoardDetail(activeBoardId);
      joinBoardRoom(activeBoardId);
      return () => leaveBoardRoom(activeBoardId);
    } else {
      setActiveBoardData(null);
    }
  }, [currentUser, activeBoardId, fetchBoardDetail]);

  // ==================================================
  // 5. REALTIME SOCKET.IO SUBSCRIPTIONS
  // ==================================================
  useEffect(() => {
    if (!currentUser) return;

    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => {
      setSocketConnected(true);
      if (activeBoardIdRef.current) {
        joinBoardRoom(activeBoardIdRef.current);
      }
    };
    const onDisconnect = () => setSocketConnected(false);

    const syncTaskInState = (task) => {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
      });
      setSelectedTask((prev) => (prev && prev.id === task.id ? task : prev));
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(task.boardId)) return prev;
        const exists = prev.tasks.some((t) => t.id === task.id);
        return {
          ...prev,
          tasks: exists
            ? prev.tasks.map((t) => (t.id === task.id ? task : t))
            : [...prev.tasks, task],
        };
      });
    };

    const onTaskCreated = ({ task }) => {
      syncTaskInState(task);
      fetchBoards();
    };

    const onTaskUpdated = ({ task }) => syncTaskInState(task);

    const onTaskMoved = ({ boardId, task }) => {
      if (task) {
        syncTaskInState(task);
      }
      if (Number(boardId) === Number(activeBoardIdRef.current)) {
        fetchBoardDetail(boardId, true);
      }
      fetchTasks();
    };

    const onTaskDeleted = ({ taskId, boardId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        return { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) };
      });
      fetchBoards();
    };

    const onColumnCreated = ({ boardId, column }) => {
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return { ...prev, columns: [...prev.columns, column] };
      });
      fetchBoards();
    };

    const onColumnUpdated = ({ boardId, column }) => {
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        return {
          ...prev,
          columns: prev.columns.map((c) => (c.id === column.id ? column : c)),
        };
      });
    };

    const onColumnReordered = ({ boardId, columns }) => {
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        return { ...prev, columns };
      });
    };

    const onColumnDeleted = ({ boardId }) => {
      if (Number(boardId) === Number(activeBoardIdRef.current)) {
        fetchBoardDetail(boardId, true);
      }
      fetchBoards();
    };

    const onMembersUpdated = ({ boardId, members }) => {
      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        return { ...prev, members };
      });
      fetchBoards();
    };

    const onBoardUpdated = ({ board }) => {
      setBoards((prev) =>
        prev.map((b) => (b.id === board.id ? { ...b, ...board } : b))
      );
      setActiveBoardData((prev) =>
        prev && prev.board?.id === board.id
          ? { ...prev, board: { ...prev.board, ...board } }
          : prev
      );
    };

    const onBoardDeleted = ({ boardId }) => {
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      if (Number(activeBoardIdRef.current) === Number(boardId)) {
        setActiveBoardId(null);
        setActiveBoardData(null);
        setCurrentPage("boards");
      }
      fetchTasks();
    };

    const onBoardInvited = ({ boardName, mode, notification }) => {
      fetchBoards();
      if (notification) {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((c) => c + 1);
      }
      showToast(
        mode === "direct"
          ? `Bạn vừa được thêm vào bảng "${boardName}"`
          : `Bạn nhận được lời mời tham gia bảng "${boardName}"`,
        "info"
      );
    };

    const onBoardRemoved = ({ boardId }) => {
      fetchBoards();
      fetchTasks();
      if (Number(activeBoardIdRef.current) === Number(boardId)) {
        setActiveBoardData(null);
        setCurrentPage("boards");
      }
    };

    const onCommentCreated = ({ taskId }) => {
      const bump = (list) =>
        list.map((t) =>
          t.id === taskId ? { ...t, commentCount: (t.commentCount || 0) + 1 } : t
        );
      setTasks(bump);
      setActiveBoardData((prev) => (prev ? { ...prev, tasks: bump(prev.tasks) } : prev));
    };

    const onCommentDeleted = ({ taskId }) => {
      const dec = (list) =>
        list.map((t) =>
          t.id === taskId
            ? { ...t, commentCount: Math.max(0, (t.commentCount || 0) - 1) }
            : t
        );
      setTasks(dec);
      setActiveBoardData((prev) => (prev ? { ...prev, tasks: dec(prev.tasks) } : prev));
    };

    const onNotificationNew = ({ notification }) => {
      if (!notification) return;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
      showToast(notification.message, "info", notification.title);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:assignees-updated", onTaskUpdated);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("column:created", onColumnCreated);
    socket.on("column:updated", onColumnUpdated);
    socket.on("column:reordered", onColumnReordered);
    socket.on("column:deleted", onColumnDeleted);
    socket.on("board:members-updated", onMembersUpdated);
    socket.on("board:updated", onBoardUpdated);
    socket.on("board:deleted", onBoardDeleted);
    socket.on("board:invited", onBoardInvited);
    socket.on("board:removed", onBoardRemoved);
    socket.on("comment:created", onCommentCreated);
    socket.on("comment:deleted", onCommentDeleted);
    socket.on("notification:new", onNotificationNew);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:assignees-updated", onTaskUpdated);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("column:created", onColumnCreated);
      socket.off("column:updated", onColumnUpdated);
      socket.off("column:reordered", onColumnReordered);
      socket.off("column:deleted", onColumnDeleted);
      socket.off("board:members-updated", onMembersUpdated);
      socket.off("board:updated", onBoardUpdated);
      socket.off("board:deleted", onBoardDeleted);
      socket.off("board:invited", onBoardInvited);
      socket.off("board:removed", onBoardRemoved);
      socket.off("comment:created", onCommentCreated);
      socket.off("comment:deleted", onCommentDeleted);
      socket.off("notification:new", onNotificationNew);
    };
  }, [currentUser, fetchBoards, fetchBoardDetail, fetchTasks, showToast]);

  // Theme được quản lý tập trung qua ThemeContext (data-theme & data-accent)

  // ==================================================
  // 6. BOARD & COLUMN HANDLERS
  // ==================================================
  const handleSelectBoard = (boardId) => {
    setActiveBoardId(boardId);
    setCurrentPage("kanban");
  };

  const handleCreateBoard = async (payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.boards, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể tạo bảng");

      await fetchBoards();
      setActiveBoardId(data.board.id);
      setCurrentPage("kanban");
      showToast(`Đã tạo không gian "${data.board.name}"!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateBoard = async (boardId, payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.boardById(boardId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể cập nhật bảng");

      await fetchBoards();
      if (Number(activeBoardId) === Number(boardId)) {
        await fetchBoardDetail(boardId, true);
      }
      showToast("Đã cập nhật không gian làm việc!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteBoard = (board) => {
    askConfirm({
      title: "Xóa không gian làm việc",
      message: `Xóa bảng "${board.name}" cùng toàn bộ cột và thẻ công việc bên trong? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa bảng",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(API_ENDPOINTS.boardById(board.id), {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Không thể xóa bảng");

          showToast("Đã xóa không gian làm việc!", "info");
          await fetchBoards();
          await fetchTasks();
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const handleRespondInvitation = async (boardId, action) => {
    try {
      const res = await fetch(API_ENDPOINTS.boardRespondInvite(boardId), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể xử lý lời mời");

      showToast(data.message, action === "accept" ? "success" : "info");
      await fetchBoards();
      await fetchTasks();
      if (action === "accept") {
        setActiveBoardId(boardId);
        setCurrentPage("kanban");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleCreateColumn = async (boardId, payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.boardColumns(boardId), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể tạo cột");

      setActiveBoardData((prev) => {
        if (!prev || Number(prev.board?.id) !== Number(boardId)) return prev;
        if (prev.columns.some((c) => c.id === data.column.id)) return prev;
        return { ...prev, columns: [...prev.columns, data.column] };
      });
      fetchBoards();
      showToast(`Đã thêm cột "${data.column.title}"!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateColumn = async (columnId, payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.columnById(columnId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể cập nhật cột");

      setActiveBoardData((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) => (c.id === columnId ? data.column : c)),
            }
          : prev
      );
      showToast("Đã cập nhật cột!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteColumn = (column) => {
    askConfirm({
      title: "Xóa cột trạng thái",
      message: `Xóa cột "${column.title}"? Toàn bộ thẻ trong cột này sẽ được chuyển an toàn sang cột bên cạnh.`,
      confirmText: "Xóa cột",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(API_ENDPOINTS.columnById(column.id), {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Không thể xóa cột");

          await fetchBoardDetail(column.boardId, true);
          fetchBoards();
          showToast(data.message, "info");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const handleReorderColumns = async (boardId, orderedColumnIds) => {
    try {
      const res = await fetch(API_ENDPOINTS.boardColumnsReorder(boardId), {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ orderedColumnIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể sắp xếp cột");
      setActiveBoardData((prev) => (prev ? { ...prev, columns: data.columns } : prev));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ==================================================
  // 7. TASK CRUD, DRAG & DROP MOVE, ASSIGNEES
  // ==================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTaskSubmit = async (payload) => {
    const res = await fetch(API_ENDPOINTS.tasks, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể thêm công việc");

    const created = data.task;
    setTasks((prev) =>
      prev.some((t) => t.id === created.id)
        ? prev.map((t) => (t.id === created.id ? created : t))
        : [created, ...prev]
    );
    if (created.boardId && Number(created.boardId) === Number(activeBoardId)) {
      setActiveBoardData((prev) =>
        prev && !prev.tasks.some((t) => t.id === created.id)
          ? { ...prev, tasks: [...prev.tasks, created] }
          : prev
      );
    }
    fetchCategories();
    fetchBoards();
    fetchNotifications();
    setShowForm(false);
    showToast("Đã thêm công việc mới!", "success");
    return created;
  };

  const handleQuickCreateBoardTask = async (boardId, columnId, title, dueDate = null) => {
    const today = new Date().toISOString().slice(0, 10);
    await handleCreateTaskSubmit({
      title,
      boardId,
      columnId,
      startDate: today,
      dueDate: dueDate || today,
      priority: "Trung bình",
    });
  };

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title?.trim()) {
      showToast("Vui lòng nhập tên công việc!", "error");
      return;
    }
    try {
      await handleCreateTaskSubmit({
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        priority: formData.priority || "Trung bình",
        status: formData.status || "Chưa bắt đầu",
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        notes: formData.notes?.trim() || "",
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        boardId: formData.boardId ? Number(formData.boardId) : null,
        columnId: formData.columnId ? Number(formData.columnId) : null,
      });
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const res = await fetch(API_ENDPOINTS.taskById(id), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể cập nhật công việc");

      const updated = data.task;
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelectedTask((prev) => (prev && prev.id === id ? updated : prev));
      setActiveBoardData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
            }
          : prev
      );
      fetchCategories();
      fetchBoards();
      fetchNotifications();
      showToast("Đã cập nhật công việc!", "success");
      return updated;
    } catch (error) {
      showToast(error.message || "Không thể cập nhật công việc", "error");
      return null;
    }
  };

  const handleMoveTask = async (taskId, targetColumnId, targetPosition) => {
    // Optimistic UI update
    setActiveBoardData((prev) => {
      if (!prev) return prev;
      const targetCol = prev.columns.find((c) => c.id === targetColumnId);
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          columnId: targetColumnId,
          position: targetPosition,
          ...(targetCol?.isDone ? { status: "Hoàn thành", progress: 100 } : {}),
        };
      });
      return { ...prev, tasks: updatedTasks };
    });

    try {
      const res = await fetch(API_ENDPOINTS.taskMove(taskId), {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ columnId: targetColumnId, position: targetPosition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể di chuyển thẻ");

      if (activeBoardId) await fetchBoardDetail(activeBoardId, true);
      fetchTasks();
      fetchBoards();
    } catch (err) {
      showToast(err.message, "error");
      if (activeBoardId) fetchBoardDetail(activeBoardId, true);
    }
  };

  const handleUpdateTaskAssignees = async (taskId, assigneeIds) => {
    try {
      const res = await fetch(API_ENDPOINTS.taskAssignees(taskId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ assigneeIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể cập nhật thành viên");

      const updated = data.task;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? updated : prev));
      setActiveBoardData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)),
            }
          : prev
      );
      showToast("Đã cập nhật thành viên phụ trách!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const completeTask = async (id, goBack = false) => {
    const task =
      tasks.find((t) => t.id === id) ||
      activeBoardData?.tasks?.find((t) => t.id === id) ||
      (selectedTask?.id === id ? selectedTask : null);
    if (!task) return;

    const isCompleted = task.status === "Hoàn thành" || task.progress === 100;
    const newStatus = isCompleted ? "Đang thực hiện" : "Hoàn thành";
    const newProgress = isCompleted ? (task.progressSteps?.length ? 0 : 50) : 100;

    // Nếu là thẻ trong board và đánh dấu hoàn thành, chuyển sang cột Done nếu có
    const updates = { status: newStatus, progress: newProgress };
    if (!isCompleted && activeBoardData?.columns?.length && Number(task.boardId) === Number(activeBoardData.board?.id)) {
      const doneCol = activeBoardData.columns.find((c) => c.isDone);
      if (doneCol) updates.columnId = doneCol.id;
    }

    const updated = await updateTask(id, updates);
    if (updated && goBack) {
      setSelectedTask(null);
      setCurrentPage(previousPage || "kanban");
    }
  };

  const archiveTask = (id) => {
    askConfirm({
      title: "Lưu trữ công việc",
      message: "Chuyển công việc này vào kho lưu trữ? Bạn có thể khôi phục bất kỳ lúc nào.",
      confirmText: "Lưu trữ",
      onConfirm: async () => {
        try {
          const res = await fetch(API_ENDPOINTS.taskArchive(id), {
            method: "PATCH",
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("Không thể lưu trữ công việc");
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setActiveBoardData((prev) =>
            prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev
          );
          if (selectedTask?.id === id) {
            setSelectedTask(null);
            setCurrentPage(previousPage || "kanban");
          }
          fetchCategories();
          fetchBoards();
          showToast("Đã chuyển vào kho lưu trữ!", "success");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const restoreTask = async (id) => {
    try {
      const res = await fetch(API_ENDPOINTS.taskRestore(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Không thể khôi phục công việc");
      const data = await res.json();
      setTasks((prev) =>
        prev.some((t) => t.id === data.task.id)
          ? prev.map((t) => (t.id === data.task.id ? data.task : t))
          : [data.task, ...prev]
      );
      if (activeBoardId && Number(data.task.boardId) === Number(activeBoardId)) {
        fetchBoardDetail(activeBoardId, true);
      }
      fetchCategories();
      fetchBoards();
      showToast("Đã khôi phục công việc!", "success");
      return true;
    } catch (err) {
      showToast(err.message, "error");
      return false;
    }
  };

  const deleteTask = (id) => {
    askConfirm({
      title: "Xác nhận xóa công việc",
      message: "Bạn muốn xóa vĩnh viễn công việc này hay chuyển vào Kho lưu trữ?",
      confirmText: "Xóa vĩnh viễn",
      secondaryText: "Chuyển vào lưu trữ",
      cancelText: "Hủy bỏ",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(API_ENDPOINTS.taskPermanent(id), {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("Không thể xóa vĩnh viễn công việc");
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setActiveBoardData((prev) =>
            prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev
          );
          if (selectedTask?.id === id) {
            setSelectedTask(null);
            setCurrentPage(previousPage || "kanban");
          }
          fetchCategories();
          fetchBoards();
          showToast("Đã xóa vĩnh viễn công việc!", "success");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
      onSecondary: async () => {
        try {
          const res = await fetch(API_ENDPOINTS.taskArchive(id), {
            method: "PATCH",
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("Không thể lưu trữ công việc");
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setActiveBoardData((prev) =>
            prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev
          );
          if (selectedTask?.id === id) {
            setSelectedTask(null);
            setCurrentPage(previousPage || "kanban");
          }
          fetchCategories();
          fetchBoards();
          showToast("Đã chuyển vào kho lưu trữ!", "info");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const permanentDeleteTask = (id) => {
    return new Promise((resolve) => {
      askConfirm({
        title: "Xóa vĩnh viễn công việc",
        message: "Hành động này sẽ xóa hoàn toàn công việc, bình luận và tệp đính kèm!",
        confirmText: "Xóa vĩnh viễn",
        isDanger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(API_ENDPOINTS.taskPermanent(id), {
              method: "DELETE",
              headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Không thể xóa công việc");
            showToast("Đã xóa vĩnh viễn công việc!", "success");
            resolve(true);
          } catch (err) {
            showToast(err.message, "error");
            resolve(false);
          }
        },
        onCancel: () => resolve(false),
      });
    });
  };

  // ==================================================
  // 8. PROGRESS STEPS & NOTIFICATIONS & PROFILE
  // ==================================================
  const getTaskProgress = (task) => {
    if (!task) return 0;
    if (task.status === "Hoàn thành") return 100;
    if (task.progressSteps?.length > 0) {
      const completed = task.progressSteps.filter((s) => s.completed).length;
      return Math.round((completed / task.progressSteps.length) * 100);
    }
    return task.progress || 0;
  };

  const toggleProgressStep = async (taskId, stepId) => {
    const task =
      tasks.find((t) => t.id === taskId) ||
      (selectedTask?.id === taskId ? selectedTask : null);
    if (!task?.progressSteps) return;
    const step = task.progressSteps.find((s) => s.id === stepId);
    if (!step) return;

    try {
      const res = await fetch(API_ENDPOINTS.taskSteps(taskId, stepId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ completed: !step.completed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi cập nhật tiến trình");
      const updated = data.task;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? updated : prev));
      setActiveBoardData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)) } : prev
      );
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const addProgressStep = async (taskId, title) => {
    const task =
      tasks.find((t) => t.id === taskId) ||
      (selectedTask?.id === taskId ? selectedTask : null);
    if (!task) return;
    const newSteps = [...(task.progressSteps || []), { title, completed: false }];
    await updateTask(taskId, { progressSteps: newSteps });
  };

  const editProgressStep = async (taskId, stepId, title) => {
    try {
      const res = await fetch(API_ENDPOINTS.taskSteps(taskId, stepId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi đổi tên bước");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setSelectedTask((prev) => (prev && prev.id === taskId ? data.task : prev));
      showToast("Đã sửa tên bước!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteProgressStep = async (taskId, stepId) => {
    const task =
      tasks.find((t) => t.id === taskId) ||
      (selectedTask?.id === taskId ? selectedTask : null);
    if (!task?.progressSteps) return;
    const remaining = task.progressSteps.filter((s) => s.id !== stepId);
    await updateTask(taskId, { progressSteps: remaining });
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(API_ENDPOINTS.notificationRead(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(API_ENDPOINTS.notificationsReadAll, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast("Đã đánh dấu tất cả là đã đọc!", "success");
    } catch {
      showToast("Không thể cập nhật thông báo", "error");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await fetch(API_ENDPOINTS.notificationDelete(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await fetch(API_ENDPOINTS.notificationsClearAll, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setNotifications([]);
      setUnreadCount(0);
      showToast("Đã xóa toàn bộ thông báo!", "info");
    } catch {
      showToast("Không thể xóa thông báo", "error");
    }
  };

  const openTaskDetail = (task) => {
    setPreviousPage(currentPage);
    setSelectedTask(task);
    setCurrentPage("task-detail");
  };

  const handleOpenTaskById = async (taskId) => {
    let task = tasks.find((t) => t.id === taskId);
    if (!task) {
      try {
        const res = await fetch(API_ENDPOINTS.taskById(taskId), {
          headers: getAuthHeaders(),
        });
        if (res.ok) task = await res.json();
      } catch (err) {
        console.error(err);
      }
    }
    if (task) openTaskDetail(task);
    else showToast("Không tìm thấy công việc này.", "warning");
  };

  const handleQuickAddTaskForDate = (dateString) => {
    setFormData((prev) => ({ ...prev, startDate: dateString, dueDate: dateString }));
    setShowForm(true);
  };

  const handleUpdateProfile = async (name, email) => {
    try {
      const res = await fetch(API_ENDPOINTS.profile, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi cập nhật hồ sơ");
      setCurrentUser(data.user);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("token", data.token);
      showToast("Cập nhật thông tin cá nhân thành công!", "success");
      return true;
    } catch (err) {
      showToast(err.message, "error");
      return false;
    }
  };

  const handleChangePassword = async (currentPassword, newPassword, confirmNewPassword) => {
    try {
      const res = await fetch(API_ENDPOINTS.changePassword, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi đổi mật khẩu");
      // Lưu token mới vì backend đã thu hồi toàn bộ token cũ ở các thiết bị khác
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      showToast(data.message || "Đổi mật khẩu thành công!", "success");
      return true;
    } catch (err) {
      showToast(err.message, "error");
      return false;
    }
  };

  // Đồng bộ URL thật (/boards/:id, /tasks/:id, /dashboard...) và hỗ trợ Back/Forward trình duyệt
  useUrlRouter({
    isAuthenticated: Boolean(currentUser),
    currentPage,
    activeBoardId,
    selectedTaskId: selectedTask?.id || null,
    onRouteChange: (parsed) => {
      if (parsed.page === "kanban" && parsed.boardId) {
        setActiveBoardId(parsed.boardId);
        setCurrentPage("kanban");
      } else if (parsed.page === "detail" && parsed.taskId) {
        handleOpenTaskById(parsed.taskId);
      } else {
        setCurrentPage(parsed.page || "boards");
      }
    },
  });

  // Hỗ trợ mở thẳng deep-link /tasks/:id sau khi đăng nhập
  const deepLinkCheckedRef = useRef(false);
  useEffect(() => {
    if (!currentUser || deepLinkCheckedRef.current) return;
    deepLinkCheckedRef.current = true;
    const parsed = parseAppRoute(window.location.pathname);
    if (parsed.page === "detail" && parsed.taskId) {
      handleOpenTaskById(parsed.taskId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleUpdateAvatar = async (avatar) => {
    try {
      const res = await fetch(API_ENDPOINTS.avatar, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ avatar }),
      });
      if (res.ok) {
        const updated = { ...currentUser, avatar };
        setCurrentUser(updated);
        localStorage.setItem("currentUser", JSON.stringify(updated));
        showToast("Đã cập nhật ảnh đại diện!", "success");
      }
    } catch {
      showToast("Không thể cập nhật ảnh đại diện", "error");
    }
  };

  const handleDeleteAccount = async (password) => {
    try {
      const res = await fetch(API_ENDPOINTS.account, {
        method: "DELETE",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || "Không thể xóa tài khoản!";
        showToast(msg, "error");
        return { ok: false, message: msg };
      }
      showToast(data.message || "Tài khoản đã được xóa vĩnh viễn.", "info");
      handleLogout();
      return { ok: true };
    } catch (err) {
      const msg = err.message || "Không thể kết nối đến máy chủ!";
      showToast(msg, "error");
      return { ok: false, message: msg };
    }
  };

  const getPriorityClass = (priority) => {
    if (priority === "Khẩn cấp") return "Khẩn-cấp urgent";
    if (priority === "Cao") return "Cao high";
    if (priority === "Trung bình") return "Trung-bình medium";
    return "Thấp low";
  };

  const filteredSearchTasks = globalSearch.trim()
    ? tasks
        .filter((t) => {
          if (t.isArchived) return false;
          const q = globalSearch.toLowerCase().trim();
          return (
            t.title?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  // ==================================================
  // 9. AUTH & INTRO SHOWCASE RENDER
  // ==================================================
  if (!currentUser) {
    const goToAuth = (page) => {
      sessionStorage.setItem("skippedIntro", "true");
      setAuthPage(page);
    };

    if (authPage === "intro") {
      return (
        <>
          <Toast toasts={toasts} removeToast={removeToast} />
          <Suspense fallback={<PageLazyFallback />}>
            <WelcomeShowcase
              onSkipToLogin={() => goToAuth("login")}
              onGoToRegister={() => goToAuth("register")}
            />
          </Suspense>
        </>
      );
    }
    if (authPage === "register") {
      return (
        <>
          <Toast toasts={toasts} removeToast={removeToast} />
          <Suspense fallback={<PageLazyFallback />}>
            <Register
              onRegister={handleRegister}
              goToLogin={() => goToAuth("login")}
              onBackToIntro={() => setAuthPage("intro")}
            />
          </Suspense>
        </>
      );
    }
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <Suspense fallback={<PageLazyFallback />}>
          <Login
            onLogin={handleLogin}
            onRegister={() => goToAuth("register")}
            onBackToIntro={() => setAuthPage("intro")}
          />
        </Suspense>
      </>
    );
  }

  // ==================================================
  // 10. MAIN APPLICATION RENDER
  // ==================================================
  return (
    <div className="app">
      <a href="#main-content" className="skip-to-content">
        Chuyển đến nội dung chính
      </a>
      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        secondaryText={confirmModal.secondaryText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onSecondary={confirmModal.onSecondary}
        onCancel={
          confirmModal.onCancel ||
          (() => setConfirmModal((prev) => ({ ...prev, isOpen: false })))
        }
      />
      <TaskFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateTaskSubmit}
        categories={categories}
        boards={boards}
        activeBoardId={activeBoardId}
        initialData={formData}
        showToast={showToast}
      />

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={(page) => {
          if (page === "tasks") setCategoryFilter("Tất cả");
          setCurrentPage(page);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        inviteCount={pendingInvitations.length}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={handleSelectBoard}
        currentUser={currentUser}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main id="main-content" className={sidebarCollapsed ? "main expanded" : "main"}>
        {/* TOP HEADER */}
        <header className="app-top-header">
          <div className="app-header-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>

            <div className="global-search-container">
              <div className="global-search-bar">
                <span className="global-search-icon" style={{ display: "flex", color: "var(--text-muted)" }}>
                  <Search size={15} strokeWidth={1.75} />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Tìm kiếm thẻ công việc trong tất cả bảng"
                  placeholder="Tìm kiếm thẻ công việc trong tất cả bảng..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                />
                {!globalSearch && <kbd className="search-kbd">Ctrl K</kbd>}
                {globalSearch && (
                  <button
                    type="button"
                    className="global-search-clear"
                    onClick={() => {
                      setGlobalSearch("");
                      setSearchFocused(false);
                    }}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                )}
              </div>

              {searchFocused && globalSearch.trim() && (
                <div className="global-search-dropdown">
                  <div className="global-search-header">
                    <span>Kết quả ({filteredSearchTasks.length})</span>
                    <button
                      type="button"
                      className="global-search-close"
                      onClick={() => setSearchFocused(false)}
                    >
                      Đóng
                    </button>
                  </div>
                  {filteredSearchTasks.length === 0 ? (
                    <div className="global-search-empty">
                      Không tìm thấy công việc phù hợp với "{globalSearch}".
                    </div>
                  ) : (
                    <div className="global-search-list">
                      {filteredSearchTasks.map((t) => (
                        <div
                          key={t.id}
                          className="global-search-item"
                          onClick={() => {
                            openTaskDetail(t);
                            setSearchFocused(false);
                            setGlobalSearch("");
                          }}
                        >
                          <div className="global-search-item-title">
                            <span className={`badge ${getPriorityClass(t.priority)}`}>
                              {t.priority}
                            </span>
                            <strong>{t.title}</strong>
                          </div>
                          <div className="global-search-item-meta">
                            {t.board && <span>{t.board.name}</span>}
                            <span className="search-status-tag">{t.status}</span>
                            {t.dueDate && <span>Hạn: {t.dueDate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="app-header-right">
            <button
              type="button"
              className="btn btn-primary app-header-quick-add"
              onClick={() => {
                setFormData({
                  title: "",
                  description: "",
                  priority: "Trung bình",
                  status: "Chưa bắt đầu",
                  startDate: "",
                  dueDate: "",
                  categoryId: "",
                  notes: "",
                  boardId: activeBoardId,
                  columnId: activeBoardData?.columns?.[0]?.id || null,
                  assigneeIds: [],
                });
                setShowForm(true);
              }}
            >
              <Plus size={15} strokeWidth={2} />
              <span>Thêm thẻ</span>
            </button>

            <ThemeQuickMenu />

            <button
              type="button"
              className="app-header-icon-btn notif-bell"
              onClick={() => setCurrentPage("notifications")}
              title="Thông báo"
              aria-label="Xem thông báo"
            >
              <Bell size={16} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>

            <div
              className="app-header-user"
              role="button"
              tabIndex={0}
              onClick={() => setCurrentPage("settings")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCurrentPage("settings");
                }
              }}
              title="Hồ sơ & Cài đặt"
              aria-label="Mở Hồ sơ & Cài đặt"
            >
              <UserAvatar avatar={currentUser?.avatar} name={currentUser?.name} size={28} />
              <span className="app-header-username">{currentUser?.name || "Người dùng"}</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT (Lazy-loaded chunks with Suspense) */}
        <div key={currentPage} className="page-enter">
          <Suspense fallback={<PageLazyFallback />}>
          {currentPage === "boards" && (
            <Boards
              boards={boards}
              pendingInvitations={pendingInvitations}
              loading={loadingBoards}
              onSelectBoard={handleSelectBoard}
              onCreateBoard={handleCreateBoard}
              onUpdateBoard={handleUpdateBoard}
              onDeleteBoard={handleDeleteBoard}
              onRespondInvitation={handleRespondInvitation}
            />
          )}

          {currentPage === "kanban" && (
            <Kanban
              boards={boards}
              activeBoardData={activeBoardData}
              loadingBoard={loadingBoardData}
              socketConnected={socketConnected}
              categories={categories}
              currentUser={currentUser}
              onSelectBoard={handleSelectBoard}
              onGoToBoards={() => setCurrentPage("boards")}
              onOpenTask={openTaskDetail}
              onToggleComplete={completeTask}
              onMoveTask={handleMoveTask}
              onQuickCreateTask={handleQuickCreateBoardTask}
              onOpenCreateTaskModal={(boardId, columnId, prefillTitle = "") => {
                setFormData({
                  title: prefillTitle,
                  description: "",
                  priority: "Trung bình",
                  status: "Chưa bắt đầu",
                  startDate: "",
                  dueDate: "",
                  categoryId: "",
                  notes: "",
                  boardId,
                  columnId,
                  assigneeIds: [],
                });
                setShowForm(true);
              }}
              onCreateColumn={handleCreateColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onReorderColumns={handleReorderColumns}
              onMembersUpdated={(members) => {
                setActiveBoardData((prev) => (prev ? { ...prev, members } : prev));
                fetchBoards();
              }}
              onLeaveBoard={() => {
                fetchBoards();
                fetchTasks();
                setCurrentPage("boards");
              }}
              showToast={showToast}
            />
          )}

          {currentPage === "dashboard" && (
            <Dashboard
              currentUser={currentUser}
              tasks={tasks}
              categories={categories}
              showForm={showForm}
              setShowForm={setShowForm}
              formData={formData}
              handleChange={handleChange}
              handleAddTask={handleAddTask}
              completeTask={completeTask}
              deleteTask={deleteTask}
              archiveTask={archiveTask}
              setSelectedTask={(t) => openTaskDetail(t)}
              setCurrentPage={setCurrentPage}
              setStatusPage={setStatusPage}
              getPriorityClass={getPriorityClass}
              getTaskProgress={getTaskProgress}
              updateTask={updateTask}
            />
          )}

          {currentPage === "myday" && (
            <MyDay
              tasks={tasks}
              categories={categories}
              completeTask={completeTask}
              setSelectedTask={(t) => openTaskDetail(t)}
              setCurrentPage={setCurrentPage}
              showToast={showToast}
              loading={loadingTasks}
              onRetry={fetchTasks}
            />
          )}

          {currentPage === "status" && (
            <TaskStatus
              tasks={tasks}
              categories={categories}
              status={statusPage}
              setCurrentPage={setCurrentPage}
              setSelectedTask={(t) => openTaskDetail(t)}
              getPriorityClass={getPriorityClass}
              getTaskProgress={getTaskProgress}
              completeTask={completeTask}
            />
          )}

          {currentPage === "tasks" && (
            <Tasks
              currentUser={currentUser}
              tasks={tasks}
              categories={categories}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              loading={loadingTasks}
              showForm={showForm}
              setShowForm={setShowForm}
              formData={formData}
              handleChange={handleChange}
              handleAddTask={handleAddTask}
              completeTask={completeTask}
              deleteTask={deleteTask}
              archiveTask={archiveTask}
              setSelectedTask={(t) => openTaskDetail(t)}
              setCurrentPage={setCurrentPage}
              getPriorityClass={getPriorityClass}
              getTaskProgress={getTaskProgress}
            />
          )}

          {currentPage === "calendar" && (
            <CalendarPage
              tasks={tasks}
              categories={categories}
              onOpenTaskDetail={openTaskDetail}
              onQuickAddTaskForDate={handleQuickAddTaskForDate}
              completeTask={completeTask}
            />
          )}

          {currentPage === "statistics" && (
            <Statistics
              tasks={tasks}
              categories={categories}
              setCurrentPage={setCurrentPage}
              setStatusPage={setStatusPage}
              setSelectedTask={(t) => openTaskDetail(t)}
            />
          )}

          {currentPage === "categories" && (
            <Categories
              categories={categories}
              setCategories={setCategories}
              fetchCategories={fetchCategories}
              setCurrentPage={setCurrentPage}
              setCategoryFilter={setCategoryFilter}
              showToast={showToast}
              askConfirm={askConfirm}
            />
          )}

          {currentPage === "archive" && (
            <Archive
              categories={categories}
              onRestoreTask={restoreTask}
              onPermanentDeleteTask={permanentDeleteTask}
              getPriorityClass={getPriorityClass}
              getTaskProgress={getTaskProgress}
              onOpenTaskDetail={openTaskDetail}
            />
          )}

          {currentPage === "notifications" && (
            <Notifications
              notifications={notifications}
              unreadCount={unreadCount}
              fetchNotifications={fetchNotifications}
              markAsRead={markNotificationRead}
              markAllAsRead={markAllNotificationsRead}
              deleteNotification={deleteNotification}
              clearAllNotifications={clearAllNotifications}
              checkReminders={checkReminders}
              onOpenTask={handleOpenTaskById}
            />
          )}

          {currentPage === "settings" && (
            <Settings
              currentUser={currentUser}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
              onUpdateAvatar={handleUpdateAvatar}
              onDeleteAccount={handleDeleteAccount}
              showToast={showToast}
              onLogout={handleLogout}
            />
          )}

          {currentPage === "ai" && (
            <AI currentUser={currentUser} tasks={tasks} categories={categories} />
          )}

          {currentPage === "task-detail" && selectedTask && (
            <TaskDetail
              selectedTask={selectedTask}
              setSelectedTask={setSelectedTask}
              categories={categories}
              currentUser={currentUser}
              boardMembers={activeBoardData?.members || []}
              boardColumns={activeBoardData?.columns || []}
              previousPage={previousPage}
              setCurrentPage={setCurrentPage}
              completeTask={completeTask}
              deleteTask={deleteTask}
              archiveTask={archiveTask}
              getTaskProgress={getTaskProgress}
              toggleProgressStep={toggleProgressStep}
              addProgressStep={addProgressStep}
              editProgressStep={editProgressStep}
              deleteProgressStep={deleteProgressStep}
              updateTask={updateTask}
              onUpdateAssignees={handleUpdateTaskAssignees}
              showToast={showToast}
              askConfirm={askConfirm}
            />
          )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default App;
