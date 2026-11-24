import React, { useMemo } from "react";
import {
  Plus,
  ListTodo,
  CheckCircle2,
  Zap,
  CircleDashed,
  AlertCircle,
  CalendarDays,
  Clock,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  Folder,
  Check,
  Activity,
} from "lucide-react";
import CountUp from "./CountUp";

function Dashboard({
  currentUser,
  tasks,
  categories,
  showForm: _showForm,
  setShowForm,
  formData: _formData,
  handleChange: _handleChange,
  handleAddTask: _handleAddTask,
  completeTask,
  deleteTask: _deleteTask,
  archiveTask: _archiveTask,
  setSelectedTask,
  setCurrentPage,
  setStatusPage,
  getPriorityClass,
  getTaskProgress,
  updateTask,
}) {
  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === Number(categoryId));
    return category ? category.name : "Không phân loại";
  };

  const goToStatisticPage = (status) => {
    setStatusPage(status);
    setCurrentPage("status");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayString = formatDate(today);

  const greetingLabel = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  const formattedTodayVi = useMemo(() => {
    return new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const {
    totalTasks,
    completedTasks,
    doingTasks,
    notStartedTasks,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    highPriorityTasks,
    overallProgress,
    riskyTasks,
  } = useMemo(() => {
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    let completed = 0;
    let doing = 0;
    let notStarted = 0;
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;
    let highPriority = 0;
    let totalPct = 0;
    const atRisk = [];

    tasks.forEach((task) => {
      const progress = getTaskProgress(task);
      totalPct += progress;

      const isCompleted = task.status === "Hoàn thành" || progress === 100;
      let isOverdue = false;

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);

        if (!isCompleted && due < today) {
          isOverdue = true;
          overdue++;
        }

        if (due.getTime() === today.getTime()) {
          dueToday++;
        } else if (due > today && due <= sevenDaysLater) {
          upcoming++;
        }

        if (!isCompleted && !isOverdue) {
          const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          if ((diffDays <= 2 && progress < 50) || (diffDays <= 4 && progress < 25)) {
            atRisk.push({
              ...task,
              daysLeft: diffDays,
              progress,
              reason:
                diffDays === 0
                  ? "Hạn chót là hôm nay nhưng tiến độ chưa đạt 50%."
                  : `Còn ${diffDays} ngày nhưng tiến độ mới đạt ${progress}%. Đề xuất tăng mức ưu tiên.`,
            });
          }
        }
      }

      if (isCompleted) {
        completed++;
      } else if (!isOverdue) {
        if (task.status === "Đang thực hiện" || task.status === "Đang làm" || progress > 0) {
          doing++;
        } else {
          notStarted++;
        }
      }

      if (task.priority === "Cao" || task.priority === "Khẩn cấp") {
        highPriority++;
      }
    });

    const overall = tasks.length > 0 ? Math.round(totalPct / tasks.length) : 0;

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      doingTasks: doing,
      notStartedTasks: notStarted,
      overdueTasks: overdue,
      todayTasks: dueToday,
      upcomingTasks: upcoming,
      highPriorityTasks: highPriority,
      overallProgress: overall,
      riskyTasks: atRisk,
    };
  }, [tasks, todayString]);

  const handleUpgradePriority = async (task) => {
    const newPriority =
      task.priority === "Khẩn cấp"
        ? "Khẩn cấp"
        : task.priority === "Cao"
        ? "Khẩn cấp"
        : "Cao";
    await updateTask(task.id, { priority: newPriority });
  };

  const upcomingList = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.dueDate &&
          t.status !== "Hoàn thành" &&
          t.progress !== 100 &&
          new Date(t.dueDate) >= today
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [tasks, todayString]);

  const overdueList = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.dueDate &&
          t.status !== "Hoàn thành" &&
          t.progress !== 100 &&
          new Date(t.dueDate) < today
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [tasks, todayString]);

  const highPriorityList = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          (t.priority === "Khẩn cấp" || t.priority === "Cao") &&
          t.status !== "Hoàn thành" &&
          t.progress !== 100
      )
      .sort((a) => (a.priority === "Khẩn cấp" ? -1 : 1))
      .slice(0, 5);
  }, [tasks]);

  const primaryKpis = [
    {
      key: "all",
      label: "Tổng số việc",
      sub: "Toàn bộ không gian",
      value: totalTasks,
      icon: <ListTodo size={18} strokeWidth={1.75} />,
      tintBg: "rgba(59, 130, 246, 0.13)",
      tintColor: "#3B82F6",
      title: "Xem tất cả công việc",
    },
    {
      key: "completed",
      label: "Đã hoàn thành",
      sub: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% tổng việc` : "Chưa có dữ liệu",
      value: completedTasks,
      icon: <CheckCircle2 size={18} strokeWidth={1.75} />,
      tintBg: "rgba(16, 185, 129, 0.13)",
      tintColor: "#10B981",
      title: "Xem công việc đã hoàn thành",
    },
    {
      key: "doing",
      label: "Đang thực hiện",
      sub: "Đang triển khai",
      value: doingTasks,
      icon: <Zap size={18} strokeWidth={1.75} />,
      tintBg: "rgba(245, 158, 11, 0.13)",
      tintColor: "#F59E0B",
      title: "Xem công việc đang thực hiện",
    },
    {
      key: "overdue",
      label: "Quá hạn",
      sub: overdueTasks > 0 ? "Cần xử lý ngay" : "Đúng tiến độ",
      value: overdueTasks,
      icon: <AlertCircle size={18} strokeWidth={1.75} />,
      tintBg: "rgba(239, 68, 68, 0.13)",
      tintColor: "#EF4444",
      dangerValue: overdueTasks > 0,
      title: "Xem danh sách công việc đã quá hạn",
    },
  ];

  const secondaryKpis = [
    {
      key: "not_started",
      label: "Chưa bắt đầu",
      value: notStartedTasks,
      icon: <CircleDashed size={15} strokeWidth={1.75} />,
      tintBg: "rgba(148, 163, 184, 0.14)",
      tintColor: "var(--text-secondary)",
      title: "Xem danh sách công việc chưa bắt đầu",
    },
    {
      key: "today",
      label: "Đến hạn hôm nay",
      value: todayTasks,
      icon: <CalendarDays size={15} strokeWidth={1.75} />,
      tintBg: "rgba(234, 179, 8, 0.14)",
      tintColor: "#EAB308",
      title: "Xem danh sách công việc đến hạn hôm nay",
    },
    {
      key: "upcoming",
      label: "Sắp đến hạn (7 ngày)",
      value: upcomingTasks,
      icon: <Clock size={15} strokeWidth={1.75} />,
      tintBg: "rgba(99, 102, 241, 0.14)",
      tintColor: "#818CF8",
      title: "Xem danh sách công việc sắp đến hạn trong 7 ngày",
    },
    {
      key: "high_priority",
      label: "Ưu tiên cao",
      value: highPriorityTasks,
      icon: <Flame size={15} strokeWidth={1.75} />,
      tintBg: "rgba(234, 88, 12, 0.14)",
      tintColor: "#EA580C",
      title: "Xem danh sách công việc ưu tiên cao hoặc khẩn cấp",
    },
  ];

  // Radial gauge math
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, Math.max(0, overallProgress)) / 100);

  // Segmented track percentages
  const safeTotal = Math.max(1, totalTasks);
  const completedShare = Math.round((completedTasks / safeTotal) * 100);
  const doingShare = Math.round((doingTasks / safeTotal) * 100);
  const overdueShare = Math.round((overdueTasks / safeTotal) * 100);

  return (
    <section className="dashboard-page page-enter">
      {/* ASYMMETRIC BENTO HERO ROW */}
      <div className="bento-hero-grid">
        {/* LEFT FEATURED COMMAND CARD */}
        <div className="bento-card bento-hero-card">
          <div className="bento-hero-ambient" aria-hidden="true" />

          <div className="bento-hero-top">
            <div className="bento-hero-copy">
              <div className="bento-date-pill">
                <Activity size={13} strokeWidth={2} />
                <span>{formattedTodayVi}</span>
              </div>
              <h1>
                {greetingLabel}, {currentUser?.name || "bạn"}
              </h1>
              <p>
                {overdueTasks > 0
                  ? `Hiện có ${overdueTasks} công việc quá hạn cần ưu tiên xử lý sớm.`
                  : "Tiến độ và hạn chót đang trong trạng thái ổn định."}
              </p>

              <div className="bento-hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={15} strokeWidth={2.2} />
                  <span>Thêm công việc mới</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => goToStatisticPage("all")}
                >
                  <span>Xem toàn bộ ({totalTasks})</span>
                  <ArrowUpRight size={14} strokeWidth={1.85} />
                </button>
              </div>
            </div>

            {/* RADIAL VELOCITY GAUGE */}
            <div className="bento-gauge-wrap" title={`Tiến độ trung bình: ${overallProgress}%`}>
              <svg className="bento-gauge-svg" viewBox="0 0 112 112">
                <circle
                  className="bento-gauge-track"
                  cx="56"
                  cy="56"
                  r={ringRadius}
                />
                <circle
                  className="bento-gauge-fill"
                  cx="56"
                  cy="56"
                  r={ringRadius}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="bento-gauge-center">
                <strong>
                  <CountUp value={overallProgress} duration={750} />%
                </strong>
                <span>Tiến độ</span>
              </div>
            </div>
          </div>

          {/* SEGMENTED PROGRESS TELEMETRY */}
          <div className="bento-telemetry-footer">
            <div className="bento-segmented-bar" aria-label="Phân bổ trạng thái công việc">
              {completedShare > 0 && (
                <div
                  className="bento-seg seg-done"
                  style={{ width: `${completedShare}%` }}
                  title={`Hoàn thành: ${completedTasks}`}
                />
              )}
              {doingShare > 0 && (
                <div
                  className="bento-seg seg-doing"
                  style={{ width: `${doingShare}%` }}
                  title={`Đang thực hiện: ${doingTasks}`}
                />
              )}
              {overdueShare > 0 && (
                <div
                  className="bento-seg seg-overdue"
                  style={{ width: `${overdueShare}%` }}
                  title={`Quá hạn: ${overdueTasks}`}
                />
              )}
            </div>

            <div className="bento-legend-row">
              <span className="bento-legend-item">
                <i className="dot-done" />
                Hoàn thành <strong>{completedTasks}</strong>
              </span>
              <span className="bento-legend-item">
                <i className="dot-doing" />
                Đang làm <strong>{doingTasks}</strong>
              </span>
              <span className="bento-legend-item">
                <i className="dot-idle" />
                Chưa bắt đầu <strong>{notStartedTasks}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT 2x2 PRIMARY BENTO METRICS */}
        <div className="bento-primary-grid">
          {primaryKpis.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`bento-card bento-metric-tile ${item.dangerValue ? "is-danger" : ""}`}
              onClick={() => goToStatisticPage(item.key)}
              title={item.title}
            >
              <div className="bento-tile-head">
                <div
                  className="bento-tile-icon"
                  style={{ background: item.tintBg, color: item.tintColor }}
                >
                  {item.icon}
                </div>
                <ArrowUpRight size={15} strokeWidth={1.75} className="bento-tile-arrow" />
              </div>

              <div className="bento-tile-body">
                <div
                  className="bento-tile-value"
                  style={{ color: item.dangerValue ? "var(--danger)" : "var(--text-primary)" }}
                >
                  <CountUp value={item.value} />
                </div>
                <div className="bento-tile-label">{item.label}</div>
                <div className="bento-tile-sub">{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECONDARY 4-ITEM TELEMETRY STRIP */}
      <div className="bento-strip-grid">
        {secondaryKpis.map((item) => (
          <button
            key={item.key}
            type="button"
            className="bento-card bento-strip-item"
            onClick={() => goToStatisticPage(item.key)}
            title={item.title}
          >
            <div
              className="bento-strip-icon"
              style={{ background: item.tintBg, color: item.tintColor }}
            >
              {item.icon}
            </div>
            <span className="bento-strip-label">{item.label}</span>
            <strong className="bento-strip-value">
              <CountUp value={item.value} />
            </strong>
          </button>
        ))}
      </div>

      {/* SMART PRIORITY INSIGHTS / RISK ALERT */}
      {riskyTasks.length > 0 && (
        <div className="bento-risk-banner">
          <div className="bento-risk-header">
            <div className="bento-risk-icon">
              <AlertTriangle size={17} strokeWidth={1.75} />
            </div>
            <div>
              <h3>Cảnh báo nguy cơ trễ hạn ({riskyTasks.length})</h3>
              <span>Các đầu việc có hạn chót cận kề nhưng tiến độ còn thấp:</span>
            </div>
          </div>

          <div className="bento-risk-list">
            {riskyTasks.map((task) => (
              <div key={task.id} className="bento-risk-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong
                      style={{ cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}
                      onClick={() => {
                        setSelectedTask(task);
                        setCurrentPage("task-detail");
                      }}
                    >
                      {task.title}
                    </strong>
                    <span className={`badge ${getPriorityClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="bento-risk-reason">
                    {task.reason} (Hạn: {task.dueDate})
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {task.priority !== "Khẩn cấp" && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleUpgradePriority(task)}
                    >
                      <ArrowUpRight size={13} strokeWidth={2} />
                      Tăng lên {task.priority === "Cao" ? "Khẩn cấp" : "Cao"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setCurrentPage("task-detail");
                    }}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 ACTIONABLE BENTO FEED COLUMNS */}
      <div className="bento-feed-grid">
        {/* COLUMN 1: UPCOMING */}
        <div className="bento-card bento-feed-card">
          <div className="bento-feed-header">
            <h3>
              <span className="bento-feed-dot" style={{ background: "#3B82F6" }} />
              Gần đến hạn hoàn thành
            </h3>
            <span className="badge badge-inprogress">{upcomingList.length} việc</span>
          </div>

          {upcomingList.length === 0 ? (
            <div className="bento-feed-empty">Không có công việc nào sắp đến hạn.</div>
          ) : (
            <div className="bento-feed-list">
              {upcomingList.map((t) => {
                const prog = getTaskProgress(t);
                return (
                  <div
                    key={t.id}
                    className="bento-feed-item"
                    style={{ borderLeftColor: "#3B82F6" }}
                    onClick={() => {
                      setSelectedTask(t);
                      setCurrentPage("task-detail");
                    }}
                  >
                    <div className="bento-feed-item-title">{t.title}</div>
                    <div className="bento-feed-item-meta">
                      <span className="bento-inline-meta">
                        <CalendarDays size={12} strokeWidth={1.75} />
                        {t.dueDate}
                      </span>
                      <span className="bento-feed-pct">{prog}%</span>
                    </div>
                    <div className="bento-mini-bar">
                      <div className="bento-mini-bar-fill" style={{ width: `${prog}%`, background: "#3B82F6" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 2: OVERDUE */}
        <div className="bento-card bento-feed-card">
          <div className="bento-feed-header">
            <h3 style={{ color: overdueList.length > 0 ? "var(--danger)" : "var(--text-primary)" }}>
              <span className="bento-feed-dot" style={{ background: "#EF4444" }} />
              Công việc quá hạn
            </h3>
            <span className="badge badge-overdue">{overdueList.length} việc</span>
          </div>

          {overdueList.length === 0 ? (
            <div className="bento-feed-empty is-good">
              <CheckCircle2 size={16} strokeWidth={1.85} />
              <span>Không có công việc nào bị quá hạn.</span>
            </div>
          ) : (
            <div className="bento-feed-list">
              {overdueList.map((t) => (
                <div
                  key={t.id}
                  className="bento-feed-item is-overdue"
                  onClick={() => {
                    setSelectedTask(t);
                    setCurrentPage("task-detail");
                  }}
                >
                  <div className="bento-feed-item-title">{t.title}</div>
                  <div className="bento-feed-item-meta" style={{ marginTop: 8 }}>
                    <span className="bento-overdue-date">Hạn cũ: {t.dueDate}</span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ padding: "4px 9px", fontSize: 11.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        completeTask(t.id);
                      }}
                    >
                      <Check size={12} strokeWidth={2.2} />
                      Xong ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 3: HIGH PRIORITY */}
        <div className="bento-card bento-feed-card">
          <div className="bento-feed-header">
            <h3>
              <span className="bento-feed-dot" style={{ background: "#EA580C" }} />
              Cần ưu tiên làm trước
            </h3>
            <span className="badge badge-high">{highPriorityList.length} việc</span>
          </div>

          {highPriorityList.length === 0 ? (
            <div className="bento-feed-empty">Không có công việc khẩn cấp nào cần xử lý ngay.</div>
          ) : (
            <div className="bento-feed-list">
              {highPriorityList.map((t) => (
                <div
                  key={t.id}
                  className="bento-feed-item"
                  style={{ borderLeftColor: t.priority === "Khẩn cấp" ? "#EF4444" : "#EA580C" }}
                  onClick={() => {
                    setSelectedTask(t);
                    setCurrentPage("task-detail");
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div className="bento-feed-item-title">{t.title}</div>
                    <span className={`badge ${getPriorityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="bento-feed-item-meta" style={{ marginTop: 6 }}>
                    <span className="bento-inline-meta">
                      <Folder size={12} strokeWidth={1.75} />
                      {getCategoryName(t.categoryId)}
                    </span>
                    <span>{t.dueDate ? `Hạn: ${t.dueDate}` : "Chưa có hạn"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
