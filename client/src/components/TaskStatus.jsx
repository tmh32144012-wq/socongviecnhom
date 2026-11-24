import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Folder,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

function TaskStatus({
  title,
  description,
  tasks = [],
  categories = [],
  status = "all",
  setCurrentPage,
  setSelectedTask,
  getPriorityClass,
  getTaskProgress,
  completeTask,
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sevenDaysLater = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  // Comprehensive filter logic for all status tabs
  const { filteredTasks, pageTitle, pageDescription } = useMemo(() => {
    let result = tasks;
    let computedTitle = title;
    let computedDesc = description;

    switch (status) {
      case "doing":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          return (
            (t.status === "Đang làm" ||
              t.status === "Đang thực hiện" ||
              (prog > 0 && prog < 100)) &&
            t.status !== "Hoàn thành"
          );
        });
        computedTitle = computedTitle || "Công việc đang thực hiện";
        computedDesc = computedDesc || "Các công việc bạn đang trong quá trình xử lý";
        break;

      case "completed":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          return t.status === "Hoàn thành" || prog === 100;
        });
        computedTitle = computedTitle || "Công việc đã hoàn thành";
        computedDesc = computedDesc || "Các công việc bạn đã hoàn thành xuất sắc";
        break;

      case "overdue":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          if (!t.dueDate || t.status === "Hoàn thành" || prog === 100) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due < today;
        });
        computedTitle = computedTitle || "Công việc quá hạn";
        computedDesc = computedDesc || "Các công việc đã qua hạn chót nhưng chưa hoàn tất";
        break;

      case "today":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          if (!t.dueDate || t.status === "Hoàn thành" || prog === 100) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due.getTime() === today.getTime();
        });
        computedTitle = computedTitle || "Công việc hôm nay";
        computedDesc = computedDesc || "Các công việc có hạn chót trong ngày hôm nay";
        break;

      case "upcoming":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          if (!t.dueDate || t.status === "Hoàn thành" || prog === 100) return false;
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          return due > today && due <= sevenDaysLater;
        });
        computedTitle = computedTitle || "Công việc sắp đến hạn (7 ngày tới)";
        computedDesc = computedDesc || "Các công việc có hạn hoàn thành cận kề trong tuần này";
        break;

      case "high_priority":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          return (
            (t.priority === "Cao" || t.priority === "Khẩn cấp") &&
            t.status !== "Hoàn thành" &&
            prog !== 100
          );
        });
        computedTitle = computedTitle || "Công việc ưu tiên cao & khẩn cấp";
        computedDesc = computedDesc || "Các công việc quan trọng cần được tập trung giải quyết trước";
        break;

      case "not_started":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          return (
            (t.status === "Chưa bắt đầu" || (!prog && prog === 0)) &&
            t.status !== "Hoàn thành"
          );
        });
        computedTitle = computedTitle || "Công việc chưa bắt đầu";
        computedDesc = computedDesc || "Các công việc đã tạo nhưng chưa khởi động tiến độ";
        break;

      case "waiting":
        result = tasks.filter((t) => t.status === "Đang chờ");
        computedTitle = computedTitle || "Công việc đang chờ";
        computedDesc = computedDesc || "Các công việc đang tạm dừng hoặc chờ phản hồi";
        break;

      case "urgent":
        result = tasks.filter((t) => {
          const prog = getTaskProgress ? getTaskProgress(t) : (t.progress || 0);
          const isDone = t.status === "Hoàn thành" || prog === 100;
          if (isDone) return false;
          if (t.priority === "Khẩn cấp") return true;
          if (t.dueDate) {
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < today) return true;
          }
          return false;
        });
        computedTitle = computedTitle || "Công việc cần xử lý gấp";
        computedDesc = computedDesc || "Danh sách công việc quá hạn hoặc có mức độ khẩn cấp cao";
        break;

      case "all":
      default:
        result = tasks;
        computedTitle = computedTitle || "Tất cả công việc";
        computedDesc = computedDesc || "Toàn bộ danh sách nhiệm vụ của bạn";
        break;
    }

    return {
      filteredTasks: result,
      pageTitle: computedTitle,
      pageDescription: computedDesc,
    };
  }, [tasks, status, today, sevenDaysLater, title, description, getTaskProgress]);

  const handleOpenTask = (task) => {
    if (setSelectedTask && setCurrentPage) {
      setSelectedTask(task);
      setCurrentPage("task-detail");
    }
  };

  return (
    <section className="tasks-page page-enter">
      {/* HEADER */}
      <header className="header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={() => setCurrentPage("dashboard")}
            style={{
              marginBottom: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.85} />
            Quay lại Bảng điều khiển
          </button>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>
      </header>

      {/* TASK LIST SECTION */}
      <div className="task-section" style={{ marginTop: '20px' }}>
        <div className="section-title">
          <div>
            <h2>Danh sách nhiệm vụ</h2>
            <p>
              Tìm thấy <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{filteredTasks.length}</strong> công việc phù hợp
            </p>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div
            className="empty"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--accent-soft)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <CheckCircle2 size={22} strokeWidth={1.75} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 650, color: 'var(--text-primary)' }}>
              Không có công việc nào trong mục này
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13.5px' }}>
              Tất cả các công việc liên quan đã được hoàn thành hoặc bạn chưa thêm công việc mới.
            </p>
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map((task) => {
              const category = categories.find((item) => Number(item.id) === Number(task.categoryId));
              const progress = getTaskProgress ? getTaskProgress(task) : (task.progress || 0);
              const isCompleted = task.status === "Hoàn thành" || progress === 100;

              return (
                <div
                  className="task-card"
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                >
                  <div className="task-check">
                    <button
                      type="button"
                      className={isCompleted ? "checked" : ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (completeTask) completeTask(task.id);
                      }}
                      title={isCompleted ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                    >
                      {isCompleted && <Check size={13} strokeWidth={2.5} />}
                    </button>
                  </div>

                  <div className="task-content">
                    <h3 className={isCompleted ? "completed" : ""}>
                      {task.title}
                    </h3>

                    <div className="task-info" style={{ flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                      <span className={`priority ${getPriorityClass ? getPriorityClass(task.priority) : ''}`}>
                        {task.priority || "Trung bình"}
                      </span>

                      {category && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Folder size={13} strokeWidth={1.75} />
                          {category.name}
                        </span>
                      )}

                      {task.dueDate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <CalendarDays size={13} strokeWidth={1.75} />
                          {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                        </span>
                      )}

                      <span
                        style={{
                          color: 'var(--accent-color)',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default TaskStatus;
