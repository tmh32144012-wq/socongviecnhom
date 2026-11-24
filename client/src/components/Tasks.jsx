import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  X,
  CalendarDays,
  Folder,
  CircleDot,
  Archive,
  Trash2,
  Check,
  RotateCcw,
  Clock,
  History,
  CheckCircle2,
  UserCheck,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import UserAvatar from "./UserAvatar";

function Tasks({
  currentUser: _currentUser,
  tasks,
  categories = [],
  categoryFilter: propCategoryFilter,
  setCategoryFilter: propSetCategoryFilter,
  showForm: _showForm,
  setShowForm,
  formData: _formData,
  handleChange: _handleChange,
  handleAddTask: _handleAddTask,
  completeTask,
  deleteTask,
  archiveTask,
  setSelectedTask,
  setCurrentPage,
  getPriorityClass,
  getTaskProgress,
  onOpenEditModal: _onOpenEditModal,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [localCategoryFilter, setLocalCategoryFilter] = useState("Tất cả");
  const categoryFilter =
    propCategoryFilter !== undefined ? propCategoryFilter : localCategoryFilter;
  const setCategoryFilter = propSetCategoryFilter || setLocalCategoryFilter;
  const [priorityFilter, setPriorityFilter] = useState("Tất cả");
  const [timeFilter, setTimeFilter] = useState("Tất cả");
  const [sortBy, setSortBy] = useState("dueDateAsc");
  const [expandedAuditIds, setExpandedAuditIds] = useState(() => new Set());
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Tick every 5s so relative modification timestamps stay live in real time
  useEffect(() => {
    if (expandedAuditIds.size === 0) return undefined;
    const timer = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [expandedAuditIds.size]);

  const toggleAuditDetail = (taskId) => {
    setNowTick(Date.now());
    setExpandedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const formatDateTime = (val, withSeconds = false) => {
    if (!val) return "—";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" } : {}),
    });
  };

  const formatRelativeLive = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    const diffSec = Math.max(0, Math.floor((nowTick - d.getTime()) / 1000));
    if (diffSec < 10) return "Vừa xong";
    if (diffSec < 60) return `${diffSec} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === Number(categoryId));
    return category ? category.name : "Chưa phân loại";
  };

  const checkDateMatch = (dueDateStr, timeMode) => {
    if (timeMode === "Tất cả") return true;
    if (!dueDateStr) return false;

    const taskDate = new Date(dueDateStr);
    taskDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (timeMode === "today") return taskDate.getTime() === today.getTime();
    if (timeMode === "tomorrow") return taskDate.getTime() === tomorrow.getTime();

    if (timeMode === "thisWeek") {
      const day = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    }

    if (timeMode === "thisMonth") {
      return (
        taskDate.getFullYear() === today.getFullYear() &&
        taskDate.getMonth() === today.getMonth()
      );
    }

    return true;
  };

  const processedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks
      .filter((task) => {
        if (searchTerm.trim() !== "") {
          const query = searchTerm.toLowerCase().trim();
          const matchTitle = task.title && task.title.toLowerCase().includes(query);
          const matchDesc =
            task.description && task.description.toLowerCase().includes(query);
          const matchNotes = task.notes && task.notes.toLowerCase().includes(query);
          if (!matchTitle && !matchDesc && !matchNotes) return false;
        }

        if (statusFilter !== "Tất cả") {
          if (statusFilter === "Quá hạn") {
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < today &&
              task.status !== "Hoàn thành" &&
              task.progress !== 100;
            if (!isOverdue && task.status !== "Quá hạn") return false;
          } else if (statusFilter === "Hoàn thành") {
            if (task.status !== "Hoàn thành" && task.progress !== 100) return false;
          } else if (statusFilter === "Đang thực hiện") {
            if (
              task.status !== "Đang thực hiện" &&
              task.status !== "Đang làm" &&
              (task.progress <= 0 || task.progress === 100)
            )
              return false;
          } else if (statusFilter === "Đang chờ") {
            if (task.status !== "Đang chờ") return false;
          } else if (statusFilter === "Chưa bắt đầu") {
            if (task.status !== "Chưa bắt đầu") return false;
          }
        }

        if (categoryFilter !== "Tất cả") {
          if (Number(task.categoryId) !== Number(categoryFilter)) return false;
        }

        if (priorityFilter !== "Tất cả") {
          if (task.priority !== priorityFilter) return false;
        }

        if (!checkDateMatch(task.dueDate, timeFilter)) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "dueDateAsc":
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          case "dueDateDesc":
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(b.dueDate) - new Date(a.dueDate);
          case "priorityDesc": {
            const rank = { "Khẩn cấp": 4, Cao: 3, "Trung bình": 2, Thấp: 1 };
            return (rank[b.priority] || 2) - (rank[a.priority] || 2);
          }
          case "priorityAsc": {
            const rank = { "Khẩn cấp": 4, Cao: 3, "Trung bình": 2, Thấp: 1 };
            return (rank[a.priority] || 2) - (rank[b.priority] || 2);
          }
          case "createdDesc":
            return (b.id || 0) - (a.id || 0);
          case "createdAsc":
            return (a.id || 0) - (b.id || 0);
          case "nameAsc":
            return a.title.localeCompare(b.title, "vi");
          case "nameDesc":
            return b.title.localeCompare(a.title, "vi");
          case "progressDesc":
            return (b.progress || 0) - (a.progress || 0);
          case "progressAsc":
            return (a.progress || 0) - (b.progress || 0);
          default:
            return 0;
        }
      });
  }, [tasks, searchTerm, statusFilter, categoryFilter, priorityFilter, timeFilter, sortBy]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "Tất cả" ||
    categoryFilter !== "Tất cả" ||
    priorityFilter !== "Tất cả" ||
    timeFilter !== "Tất cả";

  return (
    <section className="tasks-page">
      {/* FLAT MODERN HEADER (NO DUPLICATE AVATAR / NO GRADIENT BANNER) */}
      <header className="page-header" style={{ alignItems: "center", marginBottom: 20 }}>
        <div className="page-header-left">
          <h1>Tất cả công việc</h1>
          <p>
            Hiển thị <strong style={{ color: "var(--text-primary)" }}>{processedTasks.length}</strong> /{" "}
            {tasks.length} công việc — tìm kiếm, sắp xếp và lọc nhanh theo trạng thái
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={15} strokeWidth={2} />
          <span>Thêm công việc mới</span>
        </button>
      </header>

      {/* FILTER & SEARCH TOOLBAR */}
      <section className="task-section" style={{ marginTop: 0 }}>
        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 230, position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                size={15}
                strokeWidth={1.75}
                style={{
                  position: "absolute",
                  left: 12,
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên, mô tả, nội dung..."
                style={{ paddingLeft: 36, paddingRight: 32 }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    display: "flex",
                    padding: 2,
                  }}
                  aria-label="Xóa từ khóa"
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                Sắp xếp:
              </span>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: "auto", minWidth: 185, paddingTop: 8, paddingBottom: 8 }}
              >
                <option value="dueDateAsc">Hạn chót gần nhất</option>
                <option value="dueDateDesc">Hạn chót xa nhất</option>
                <option value="priorityDesc">Ưu tiên: Cao → Thấp</option>
                <option value="priorityAsc">Ưu tiên: Thấp → Cao</option>
                <option value="createdDesc">Mới nhất trước</option>
                <option value="createdAsc">Cũ nhất trước</option>
                <option value="nameAsc">Tên: A → Z</option>
                <option value="nameDesc">Tên: Z → A</option>
                <option value="progressDesc">Tiến độ: Cao → Thấp</option>
                <option value="progressAsc">Tiến độ: Thấp → Cao</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="form-select"
              style={{ width: "auto", paddingTop: 7, paddingBottom: 7, fontSize: 13 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Tất cả">Trạng thái: Tất cả</option>
              <option value="Chưa bắt đầu">Chưa bắt đầu</option>
              <option value="Đang thực hiện">Đang thực hiện</option>
              <option value="Đang chờ">Đang chờ</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Quá hạn">Quá hạn</option>
            </select>

            <select
              className="form-select"
              style={{ width: "auto", paddingTop: 7, paddingBottom: 7, fontSize: 13 }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="Tất cả">Thời gian: Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="tomorrow">Ngày mai</option>
              <option value="thisWeek">Trong tuần này</option>
              <option value="thisMonth">Trong tháng này</option>
            </select>

            <select
              className="form-select"
              style={{ width: "auto", paddingTop: 7, paddingBottom: 7, fontSize: 13 }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="Tất cả">Ưu tiên: Tất cả</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>

            <select
              className="form-select"
              style={{ width: "auto", paddingTop: 7, paddingBottom: 7, fontSize: 13 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Tất cả">Danh mục: Tất cả</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("Tất cả");
                  setCategoryFilter("Tất cả");
                  setPriorityFilter("Tất cả");
                  setTimeFilter("Tất cả");
                }}
              >
                <RotateCcw size={13} strokeWidth={1.75} />
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* TASK LIST */}
        <div className="task-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && tasks.length === 0 ? (
            <>
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </>
          ) : processedTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={22} strokeWidth={1.75} />
              </div>
              <h3>Không tìm thấy công việc phù hợp</h3>
              <p>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
            </div>
          ) : (
            processedTasks.map((task) => {
              const progressPct = getTaskProgress(task);
              const isCompleted = task.status === "Hoàn thành" || progressPct === 100;
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0) &&
                !isCompleted;

              const leftBorderColor = isCompleted
                ? "var(--success)"
                : task.priority === "Khẩn cấp" || isOverdue
                ? "var(--danger)"
                : "var(--accent-color)";

              const isAuditOpen = expandedAuditIds.has(task.id);
              const modifierName =
                task.lastModifiedBy?.name ||
                task.lastModifiedByName ||
                task.creator?.name ||
                "Người dùng";
              const modifierAvatar =
                task.lastModifiedBy?.avatar || task.creator?.avatar || null;
              const completedTimeVal = isCompleted ? task.completedAt || task.updatedAt : null;

              return (
                <div
                  className={`task-card task-card-expandable ${isAuditOpen ? "audit-open" : ""}`}
                  key={task.id}
                  style={{
                    borderLeft: `3px solid ${leftBorderColor}`,
                    background: "var(--bg-surface)",
                  }}
                >
                  <div className="task-card-main-row">
                    {/* CHECK */}
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      className={`task-checkbox ${isCompleted ? "checked" : ""}`}
                      title={isCompleted ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                    >
                      {isCompleted && <Check size={12} strokeWidth={2.5} color="#FFFFFF" />}
                    </button>

                    {/* CONTENT */}
                    <div className="task-content">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <h3
                          className={`task-title ${isCompleted ? "completed" : ""}`}
                          onClick={() => {
                            setSelectedTask(task);
                            setCurrentPage("task-detail");
                          }}
                          style={{
                            cursor: "pointer",
                            margin: 0,
                            textDecoration: isCompleted ? "line-through" : "none",
                            color: isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                          }}
                        >
                          {task.title}
                        </h3>

                        {task.priority === "Khẩn cấp" && (
                          <span className="badge badge-urgent">Khẩn cấp</span>
                        )}

                        {isOverdue && <span className="badge badge-overdue">Quá hạn</span>}
                      </div>

                      {task.description && (
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          alignItems: "center",
                          fontSize: 12.5,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {task.dueDate && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: isOverdue ? "#F87171" : "inherit",
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            <CalendarDays size={13} strokeWidth={1.75} />
                            Hạn: {task.dueDate}
                          </span>
                        )}

                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Folder size={13} strokeWidth={1.75} />
                          {getCategoryName(task.categoryId)}
                        </span>

                        <span className={`badge ${getPriorityClass(task.priority)}`}>
                          {task.priority}
                        </span>

                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CircleDot size={13} strokeWidth={1.75} />
                          {task.status}
                        </span>

                        <span>
                          Tiến độ: <strong style={{ color: "var(--text-primary)" }}>{progressPct}%</strong>
                          {task.progressSteps && task.progressSteps.length > 0 && (
                            <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>
                              ({task.progressSteps.filter((s) => s.completed).length}/
                              {task.progressSteps.length} bước)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* CREATION TIME + CLICKABLE REALTIME AUDIT DETAIL TRIGGER */}
                      <div className="task-created-audit-bar">
                        <span className="task-created-pill">
                          <Clock size={12.5} strokeWidth={1.8} />
                          <span>Tạo lúc: <strong>{formatDateTime(task.createdAt)}</strong></span>
                        </span>

                        <button
                          type="button"
                          className={`task-audit-toggle-btn ${isAuditOpen ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAuditDetail(task.id);
                          }}
                          aria-expanded={isAuditOpen}
                          title="Xem thời gian hoàn thành, sửa đổi và người sửa đổi theo thời gian thực"
                        >
                          <History size={12.5} strokeWidth={1.85} />
                          <span>Chi tiết</span>
                          <ChevronDown
                            size={13}
                            strokeWidth={2}
                            className={`task-audit-chevron ${isAuditOpen ? "open" : ""}`}
                          />
                        </button>
                      </div>

                      {/* Subtle progress bar */}
                      <div className="progress-bar-wrap" style={{ marginTop: 8, maxWidth: 260, height: 4 }}>
                        <div
                          className={`progress-bar-fill ${isCompleted ? "success" : ""}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setCurrentPage("task-detail");
                        }}
                      >
                        <ExternalLink size={13} strokeWidth={1.8} />
                        Mở thẻ
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        title="Chuyển vào kho lưu trữ"
                        onClick={() => archiveTask(task.id)}
                      >
                        <Archive size={15} strokeWidth={1.75} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-icon"
                        title="Xóa công việc"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE REALTIME AUDIT DETAIL PANEL */}
                  {isAuditOpen && (
                    <div
                      className="task-audit-drawer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="task-audit-drawer-head">
                        <span className="task-audit-live-badge">
                          <i />
                          Đồng bộ thời gian thực
                        </span>
                        <span className="task-audit-creator-note">
                          Người tạo: <strong>{task.creator?.name || modifierName}</strong>
                        </span>
                      </div>

                      <div className="task-audit-grid">
                        <div className="task-audit-cell">
                          <span className="task-audit-label">
                            <CheckCircle2 size={13} strokeWidth={1.85} />
                            Thời gian hoàn thành
                          </span>
                          <strong className={completedTimeVal ? "is-done" : "is-pending"}>
                            {completedTimeVal
                              ? formatDateTime(completedTimeVal, true)
                              : "Chưa hoàn thành"}
                          </strong>
                        </div>

                        <div className="task-audit-cell">
                          <span className="task-audit-label">
                            <Clock size={13} strokeWidth={1.85} />
                            Thời gian sửa đổi gần nhất
                          </span>
                          <strong>{formatDateTime(task.updatedAt || task.createdAt, true)}</strong>
                          <em className="task-audit-relative">
                            {formatRelativeLive(task.updatedAt || task.createdAt)}
                          </em>
                        </div>

                        <div className="task-audit-cell">
                          <span className="task-audit-label">
                            <UserCheck size={13} strokeWidth={1.85} />
                            Người sửa đổi gần nhất
                          </span>
                          <div className="task-audit-modifier">
                            <UserAvatar avatar={modifierAvatar} name={modifierName} size={22} />
                            <strong>{modifierName}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </section>
  );
}

export default Tasks;
