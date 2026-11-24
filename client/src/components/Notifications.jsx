import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FilePlus2,
  UserPlus,
  MessageSquare,
  Mail,
  Bell,
  Check,
  ExternalLink,
} from "lucide-react";

function Notifications({
  notifications,
  unreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  checkReminders,
  onOpenTask,
}) {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const filteredList =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const stats = useMemo(() => {
    const deadlineAlerts = notifications.filter(
      (n) => n.type === "overdue" || n.type === "deadline"
    ).length;
    const teamEvents = notifications.filter(
      (n) => n.type === "assign" || n.type === "comment" || n.type === "invite"
    ).length;
    const readCount = Math.max(0, notifications.length - unreadCount);
    return { deadlineAlerts, teamEvents, readCount };
  }, [notifications, unreadCount]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case "overdue":
        return {
          icon: <AlertTriangle size={16} strokeWidth={1.8} />,
          bg: "rgba(239, 68, 68, 0.12)",
          color: "#EF4444",
          border: "#EF4444",
          tag: "OVERDUE",
        };
      case "deadline":
        return {
          icon: <Clock size={16} strokeWidth={1.8} />,
          bg: "rgba(245, 158, 11, 0.12)",
          color: "#F59E0B",
          border: "#F59E0B",
          tag: "DEADLINE",
        };
      case "completed":
        return {
          icon: <CheckCircle2 size={16} strokeWidth={1.8} />,
          bg: "rgba(16, 185, 129, 0.12)",
          color: "#10B981",
          border: "#10B981",
          tag: "DONE",
        };
      case "assign":
        return {
          icon: <UserPlus size={16} strokeWidth={1.8} />,
          bg: "rgba(59, 130, 246, 0.12)",
          color: "#3B82F6",
          border: "#3B82F6",
          tag: "ASSIGN",
        };
      case "comment":
        return {
          icon: <MessageSquare size={16} strokeWidth={1.8} />,
          bg: "var(--accent-soft)",
          color: "var(--accent-color)",
          border: "var(--accent-color)",
          tag: "COMMENT",
        };
      case "invite":
        return {
          icon: <Mail size={16} strokeWidth={1.8} />,
          bg: "rgba(234, 88, 12, 0.12)",
          color: "#EA580C",
          border: "#EA580C",
          tag: "INVITE",
        };
      case "new":
        return {
          icon: <FilePlus2 size={16} strokeWidth={1.8} />,
          bg: "var(--accent-soft)",
          color: "var(--accent-color)",
          border: "var(--accent-color)",
          tag: "TASK",
        };
      default:
        return {
          icon: <Bell size={16} strokeWidth={1.8} />,
          bg: "var(--bg-input)",
          color: "var(--text-secondary)",
          border: "var(--border-strong)",
          tag: "SYSTEM",
        };
    }
  };

  const handleManualScan = async () => {
    setLoading(true);
    await checkReminders();
    await fetchNotifications();
    setLoading(false);
  };

  return (
    <section className="notifications-page page-enter">
      {/* CONSOLE HEADER */}
      <div className="notif-console-header">
        <div>
          <div className="notif-title-line">
            <h1>Trung tâm Thông báo &amp; Lời nhắc</h1>
            <span className="tech-tag">INBOX.LIVE</span>
          </div>
          <p>Theo dõi giao việc, bình luận nhóm, lời mời tham gia bảng và cảnh báo hạn chót</p>
        </div>

        <div className="notif-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleManualScan}
            disabled={loading}
          >
            <RefreshCw size={14} strokeWidth={1.85} />
            {loading ? "Đang quét..." : "Quét nhắc việc"}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={markAllAsRead}
            >
              <CheckCheck size={14} strokeWidth={1.85} />
              Đọc tất cả ({unreadCount})
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={clearAllNotifications}
            >
              <Trash2 size={14} strokeWidth={1.85} />
              Xóa hết
            </button>
          )}
        </div>
      </div>

      {/* FULL-WIDTH 2-PANE INBOX WORKBENCH */}
      <div className="notif-workbench">
        {/* LEFT PANE: STREAM */}
        <div className="tech-panel">
          <div className="tech-panel-head">
            <div className="notif-filter-tabs">
              <button
                type="button"
                className={`notif-tab-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                className={`notif-tab-btn ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
            <span className="tech-module-code">EVENT.STREAM</span>
          </div>

          <div className="notif-stream-body">
            {filteredList.length === 0 ? (
              <div className="notif-empty-box">
                <div className="notif-empty-icon">
                  <Bell size={20} strokeWidth={1.75} />
                </div>
                <h3>
                  {filter === "unread"
                    ? "Không có thông báo chưa đọc"
                    : "Chưa có thông báo nào"}
                </h3>
                <p>
                  Mọi cập nhật về giao việc, bình luận nhóm và cảnh báo hạn chót sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              filteredList.map((notif) => {
                const style = getTypeStyle(notif.type);
                return (
                  <div
                    key={notif.id}
                    className={`notif-row-item ${notif.isRead ? "is-read" : "is-unread"}`}
                    style={{ borderLeftColor: style.border }}
                  >
                    <div
                      className="notif-row-icon"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.icon}
                    </div>

                    <div className="notif-row-main">
                      <div className="notif-row-title-line">
                        <h3>{notif.title}</h3>
                        <span className="notif-type-code">{style.tag}</span>
                        {!notif.isRead && <span className="notif-unread-dot" />}
                      </div>

                      <p className="notif-row-msg">{notif.message}</p>

                      <div className="notif-row-time">
                        <Clock size={11.5} strokeWidth={1.75} />
                        <span>{formatTime(notif.createdAt)}</span>
                      </div>
                    </div>

                    <div className="notif-row-actions">
                      {!notif.isRead && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Đánh dấu đã đọc"
                          onClick={() => markAsRead(notif.id)}
                        >
                          <Check size={13} strokeWidth={2} />
                          Đã đọc
                        </button>
                      )}

                      {notif.taskId && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Xem công việc liên quan"
                          onClick={() => onOpenTask(notif.taskId)}
                        >
                          <ExternalLink size={13} strokeWidth={1.75} />
                          Xem
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        title="Xóa thông báo"
                        onClick={() => deleteNotification(notif.id)}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: TELEMETRY SUMMARY RAIL */}
        <aside className="notif-rail">
          <div className="tech-panel">
            <div className="tech-panel-head">
              <div className="tech-panel-title">
                <Bell size={14} strokeWidth={1.85} />
                <h2>Tóm tắt sự kiện</h2>
              </div>
              <span className="tech-module-code">METRICS</span>
            </div>

            <div className="notif-metrics-grid">
              <div className="notif-metric-cell">
                <span>Chưa đọc</span>
                <strong style={{ color: unreadCount > 0 ? "var(--accent-color)" : "var(--text-primary)" }}>
                  {unreadCount}
                </strong>
              </div>
              <div className="notif-metric-cell">
                <span>Cảnh báo hạn</span>
                <strong style={{ color: stats.deadlineAlerts > 0 ? "var(--danger)" : "var(--text-primary)" }}>
                  {stats.deadlineAlerts}
                </strong>
              </div>
              <div className="notif-metric-cell">
                <span>Hoạt động nhóm</span>
                <strong>{stats.teamEvents}</strong>
              </div>
              <div className="notif-metric-cell">
                <span>Đã xem</span>
                <strong>{stats.readCount}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Notifications;
