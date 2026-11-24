import React, { useMemo, useState } from "react";
import {
  Sun,
  AlertTriangle,
  Clock,
  Flame,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
  Check,
  AlertCircle,
} from "lucide-react";
import "./MyDay.css";

function MyDay({
  tasks = [],
  categories = [],
  completeTask,
  setSelectedTask,
  setCurrentPage,
  showToast: _showToast,
  loading = false,
  error = null,
  onRetry,
}) {
  const [completingId, setCompletingId] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const dayNames = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  const monthNames = [
    "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
    "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12",
  ];
  const dayOfWeek = dayNames[today.getDay()];
  const dateDisplay = `${today.getDate()} ${monthNames[today.getMonth()]}, ${today.getFullYear()}`;

  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === Number(categoryId));
    return cat ? { name: cat.name, color: cat.color || "var(--accent-color)" } : null;
  };

  const getPriorityLabel = (priority) => {
    const map = { "Khẩn cấp": "urgent", Cao: "high", "Trung bình": "medium", Thấp: "low" };
    return map[priority] || "medium";
  };

  const { todayTasks, overdueTasks, upcomingTasks, highPriorityTasks, completedToday } = useMemo(() => {
    const isOverdue = (task) => {
      if (!task.dueDate || task.status === "Hoàn thành" || task.progress === 100) return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    };

    const isUpcoming = (task) => {
      if (!task.dueDate || task.status === "Hoàn thành" || task.progress === 100) return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due - today) / 86400000);
      return diff > 0 && diff <= 3;
    };

    const todayT = tasks.filter(
      (t) => t.dueDate === todayStr && t.status !== "Hoàn thành" && t.progress !== 100
    );
    const overdueT = tasks.filter(isOverdue);
    const upcomingT = tasks.filter(isUpcoming).slice(0, 5);
    const highT = tasks
      .filter(
        (t) =>
          (t.priority === "Khẩn cấp" || t.priority === "Cao") &&
          t.status !== "Hoàn thành" &&
          t.progress !== 100 &&
          !isOverdue(t) &&
          t.dueDate !== todayStr
      )
      .slice(0, 5);
    const completedT = tasks.filter(
      (t) => (t.status === "Hoàn thành" || t.progress === 100) && t.dueDate === todayStr
    );
    return {
      todayTasks: todayT,
      overdueTasks: overdueT,
      upcomingTasks: upcomingT,
      highPriorityTasks: highT,
      completedToday: completedT,
    };
  }, [tasks, todayStr, today]);

  const totalTodayWork = todayTasks.length + completedToday.length;
  const completionRate =
    totalTodayWork > 0 ? Math.round((completedToday.length / totalTodayWork) * 100) : 0;

  const handleComplete = async (taskId) => {
    setCompletingId(taskId);
    try {
      await completeTask(taskId);
    } finally {
      setTimeout(() => setCompletingId(null), 500);
    }
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setCurrentPage("task-detail");
  };

  const TaskRow = ({ task, accent }) => {
    const cat = getCategoryName(task.categoryId);
    const priorityKey = getPriorityLabel(task.priority);
    const isCompleting = completingId === task.id;
    const isDone = task.status === "Hoàn thành" || task.progress === 100;

    return (
      <div className={`myday-task-row ${isDone ? "done" : ""} ${isCompleting ? "completing" : ""}`}>
        <button
          type="button"
          className={`myday-task-check ${isDone ? "checked" : ""}`}
          onClick={() => handleComplete(task.id)}
          aria-label={isDone ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
          style={accent && !isDone ? { borderColor: accent } : undefined}
        >
          {isDone && <Check size={12} strokeWidth={2.5} color="#FFFFFF" />}
        </button>

        <div className="myday-task-info" onClick={() => openTask(task)}>
          <span className={`myday-task-title ${isDone ? "done-text" : ""}`}>
            {task.title}
          </span>
          <div className="myday-task-meta">
            {cat && (
              <span
                className="myday-cat-tag"
                style={{ background: "var(--accent-soft)", color: "var(--accent-color)" }}
              >
                {cat.name}
              </span>
            )}
            <span className={`badge badge-${priorityKey}`}>{task.priority}</span>
            {task.dueDate && (
              <span className="myday-task-date">
                <CalendarDays size={12} strokeWidth={1.75} />
                {task.dueDate}
              </span>
            )}
            {task.progress > 0 && task.progress < 100 && (
              <span className="myday-task-progress">{task.progress}%</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="myday-task-open-btn"
          onClick={() => openTask(task)}
          aria-label="Xem chi tiết"
          title="Xem chi tiết"
        >
          <ChevronRight size={15} strokeWidth={1.75} />
        </button>
      </div>
    );
  };

  const Section = ({ title, icon, tasks: sectionTasks, accent }) => {
    if (sectionTasks.length === 0) return null;
    return (
      <div className="myday-section">
        <div className="myday-section-header">
          <div className="myday-section-title">
            <span className="myday-section-dot" style={{ background: accent }} />
            <span style={{ color: accent, display: "flex" }}>{icon}</span>
            <h3>{title}</h3>
          </div>
          <span className="myday-section-count">{sectionTasks.length}</span>
        </div>
        <div className="myday-tasks-list">
          {sectionTasks.map((task) => (
            <TaskRow key={task.id} task={task} accent={accent} />
          ))}
        </div>
      </div>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="myday-page page-enter">
        <header className="page-header">
          <div className="page-header-left">
            <h1>{dayOfWeek}, {dateDisplay}</h1>
            <p>Đang tải dữ liệu công việc hôm nay...</p>
          </div>
        </header>
        <div className="myday-stats">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: 74 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myday-page page-enter">
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="empty-state-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#F87171" }}>
            <AlertCircle size={24} strokeWidth={1.75} />
          </div>
          <h3>Không thể tải dữ liệu hôm nay</h3>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const allEmpty =
    todayTasks.length === 0 &&
    overdueTasks.length === 0 &&
    upcomingTasks.length === 0 &&
    highPriorityTasks.length === 0 &&
    completedToday.length === 0;

  return (
    <div className="myday-page page-enter">
      {/* FLAT MODERN PAGE HEADER */}
      <div className="myday-header-flat">
        <div>
          <span className="myday-day-pill">{dayOfWeek}</span>
          <h1>Hôm nay — {dateDisplay}</h1>
          <p>
            {overdueTasks.length > 0
              ? `Bạn có ${overdueTasks.length} công việc quá hạn cần ưu tiên xử lý.`
              : todayTasks.length > 0
              ? `Hôm nay có ${todayTasks.length} công việc đến hạn cần hoàn thành.`
              : "Không có công việc tồn đọng nào cần xử lý gấp trong hôm nay."}
          </p>
        </div>

        {totalTodayWork > 0 && (
          <div className="myday-progress-pill">
            <div className="myday-progress-ring-wrap">
              <svg width="56" height="56" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - completionRate / 100)}`}
                  transform="rotate(-90 32 32)"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <span className="myday-progress-pct">{completionRate}%</span>
            </div>
            <div>
              <div className="myday-progress-label">Tiến độ hôm nay</div>
              <div className="myday-progress-counts">
                <strong>{completedToday.length}</strong> / {totalTodayWork} việc
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 STAT CARDS WITH FROSTED TINTED ICON BOXES */}
      <div className="myday-stats">
        {[
          {
            label: "Hôm nay",
            value: todayTasks.length,
            icon: <Sun size={18} strokeWidth={1.75} />,
            color: "#F59E0B",
            bg: "rgba(245, 158, 11, 0.12)",
          },
          {
            label: "Quá hạn",
            value: overdueTasks.length,
            icon: <AlertTriangle size={18} strokeWidth={1.75} />,
            color: "#EF4444",
            bg: "rgba(239, 68, 68, 0.12)",
          },
          {
            label: "Sắp đến hạn",
            value: upcomingTasks.length,
            icon: <Clock size={18} strokeWidth={1.75} />,
            color: "#3B82F6",
            bg: "rgba(59, 130, 246, 0.12)",
          },
          {
            label: "Ưu tiên cao",
            value: highPriorityTasks.length,
            icon: <Flame size={18} strokeWidth={1.75} />,
            color: "#EA580C",
            bg: "rgba(234, 88, 12, 0.12)",
          },
        ].map((stat) => (
          <div key={stat.label} className="myday-stat-card">
            <div className="myday-stat-icon" style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div className="myday-stat-label">{stat.label}</div>
              <div className="myday-stat-value">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {allEmpty && (
        <div className="empty-state" style={{ marginTop: 12 }}>
          <div className="empty-state-icon">
            <Sun size={24} strokeWidth={1.75} />
          </div>
          <h3>Hôm nay bạn không có công việc cần xử lý</h3>
          <p>Bạn có thể mở danh sách tất cả công việc hoặc lên kế hoạch cho ngày tiếp theo.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCurrentPage("tasks")}
          >
            Xem tất cả công việc
          </button>
        </div>
      )}

      {/* SECTIONS */}
      <div className="myday-sections">
        <Section
          title="Quá hạn — Cần xử lý ngay"
          icon={<AlertTriangle size={16} strokeWidth={1.75} />}
          tasks={overdueTasks}
          accent="#EF4444"
        />
        <Section
          title="Hôm nay"
          icon={<Sun size={16} strokeWidth={1.75} />}
          tasks={todayTasks}
          accent="#F59E0B"
        />
        <Section
          title="Sắp đến hạn (3 ngày tới)"
          icon={<Clock size={16} strokeWidth={1.75} />}
          tasks={upcomingTasks}
          accent="#3B82F6"
        />
        <Section
          title="Ưu tiên cao"
          icon={<Flame size={16} strokeWidth={1.75} />}
          tasks={highPriorityTasks}
          accent="#EA580C"
        />

        {completedToday.length > 0 && (
          <div className="myday-section myday-section-completed">
            <div className="myday-section-header">
              <div className="myday-section-title">
                <span className="myday-section-dot" style={{ background: "var(--success)" }} />
                <span style={{ color: "var(--success)", display: "flex" }}>
                  <CheckCircle2 size={16} strokeWidth={1.75} />
                </span>
                <h3>Đã hoàn thành hôm nay</h3>
              </div>
              <span className="myday-section-count">{completedToday.length}</span>
            </div>
            <div className="myday-tasks-list">
              {completedToday.map((task) => (
                <TaskRow key={task.id} task={task} accent="var(--success)" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyDay;
