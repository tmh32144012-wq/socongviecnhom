import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";

function CalendarPage({
  tasks,
  categories: _categories,
  onOpenTaskDetail,
  onQuickAddTaskForDate,
  completeTask,
}) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  ];
  const dayNames = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayString = formatDate(new Date());

  const changeMonth = (amount) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(calendarDate.getMonth() + amount);
    setCalendarDate(newDate);
    setSelectedDate(newDate);
  };

  const changeWeek = (amount) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + amount * 7);
    setSelectedDate(newDate);
    setCalendarDate(newDate);
  };

  const changeDay = (amount) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + amount);
    setSelectedDate(newDate);
    setCalendarDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarDate(today);
    setSelectedDate(today);
  };

  const getTasksByDate = (date) => {
    if (!date) return [];
    const dateString = formatDate(date);
    return tasks.filter((t) => t.dueDate === dateString);
  };

  const getCalendarTaskClass = (task) => {
    if (task.status === "Hoàn thành" || task.progress === 100) {
      return "calendar-task-completed";
    }
    if (!task.dueDate) return "";
    if (task.dueDate === todayString) return "calendar-task-today";
    if (task.dueDate < todayString) return "calendar-task-overdue";
    return "calendar-task-upcoming";
  };

  const getMonthDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getWeekDays = () => {
    const date = new Date(selectedDate);
    const day = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      weekDays.push(current);
    }
    return weekDays;
  };

  return (
    <section className="calendar-page">
      <header className="page-header" style={{ marginBottom: 18 }}>
        <div className="page-header-left">
          <h1>Lịch hạn chót</h1>
          <p>Theo dõi lịch trình, hạn hoàn thành và phân bố công việc theo tháng, tuần hoặc ngày</p>
        </div>
      </header>

      <section className="calendar-section">
        {/* CONTROLS */}
        <div className="calendar-header">
          <div className="calendar-title">
            <button
              type="button"
              className="calendar-nav"
              onClick={() => {
                if (calendarView === "month") changeMonth(-1);
                if (calendarView === "week") changeWeek(-1);
                if (calendarView === "day") changeDay(-1);
              }}
              aria-label="Khoảng trước"
            >
              <ChevronLeft size={17} strokeWidth={1.75} />
            </button>

            <h2>
              {calendarView === "month" &&
                `${monthNames[calendarDate.getMonth()]}, ${calendarDate.getFullYear()}`}
              {calendarView === "week" &&
                `Tuần ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}
              {calendarView === "day" &&
                `Ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}
            </h2>

            <button
              type="button"
              className="calendar-nav"
              onClick={() => {
                if (calendarView === "month") changeMonth(1);
                if (calendarView === "week") changeWeek(1);
                if (calendarView === "day") changeDay(1);
              }}
              aria-label="Khoảng sau"
            >
              <ChevronRight size={17} strokeWidth={1.75} />
            </button>
          </div>

          <div className="calendar-actions">
            <button type="button" className="today-button" onClick={goToToday}>
              Hôm nay
            </button>

            <div className="calendar-view-buttons">
              <button
                type="button"
                className={calendarView === "day" ? "active" : ""}
                onClick={() => setCalendarView("day")}
              >
                Ngày
              </button>
              <button
                type="button"
                className={calendarView === "week" ? "active" : ""}
                onClick={() => setCalendarView("week")}
              >
                Tuần
              </button>
              <button
                type="button"
                className={calendarView === "month" ? "active" : ""}
                onClick={() => setCalendarView("month")}
              >
                Tháng
              </button>
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="calendar-legend">
          <span>
            <i className="legend-dot upcoming" /> Chưa đến hạn
          </span>
          <span>
            <i className="legend-dot today" /> Hôm nay
          </span>
          <span>
            <i className="legend-dot overdue" /> Quá hạn
          </span>
          <span>
            <i className="legend-dot completed" /> Hoàn thành
          </span>
        </div>

        {/* MONTH VIEW */}
        {calendarView === "month" && (
          <div className="calendar-month">
            <div className="calendar-weekdays">
              {dayNames.map((day) => (
                <div key={day} className={day === "CN" ? "sunday" : ""}>
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {getMonthDays().map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="calendar-cell empty" />;
                }

                const dateString = formatDate(date);
                const isToday = dateString === todayString;
                const isSelected = dateString === formatDate(selectedDate);
                const dayTasks = getTasksByDate(date);

                return (
                  <div
                    key={dateString}
                    className={`calendar-cell ${isToday ? "today" : ""} ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => onQuickAddTaskForDate(dateString)}
                    title="Nhấn đúp để thêm công việc vào ngày này"
                  >
                    <div className="calendar-date">
                      <span className={isToday ? "calendar-date-today-badge" : ""}>
                        {date.getDate()}
                      </span>
                      <button
                        type="button"
                        className="calendar-cell-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAddTaskForDate(dateString);
                        }}
                        title="Thêm công việc"
                      >
                        <Plus size={13} strokeWidth={2} />
                      </button>
                    </div>

                    <div className="calendar-cell-tasks">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`calendar-task ${getCalendarTaskClass(task)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTaskDetail(task);
                          }}
                          title={`${task.title} — ${task.status}`}
                        >
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {calendarView === "week" && (
          <div className="calendar-week-grid">
            {getWeekDays().map((date) => {
              const dateString = formatDate(date);
              const isToday = dateString === todayString;
              const dayTasks = getTasksByDate(date);

              return (
                <div
                  key={dateString}
                  className={`calendar-week-col ${isToday ? "is-today" : ""}`}
                >
                  <div className="calendar-week-col-head">
                    <strong>
                      {dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]} ({date.getDate()}/
                      {date.getMonth() + 1})
                    </strong>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "3px 7px", fontSize: 11.5 }}
                      onClick={() => onQuickAddTaskForDate(dateString)}
                    >
                      <Plus size={12} strokeWidth={2} />
                      Thêm
                    </button>
                  </div>

                  <div className="calendar-week-col-body">
                    {dayTasks.length === 0 ? (
                      <span className="calendar-week-empty">Không có việc</span>
                    ) : (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`calendar-task ${getCalendarTaskClass(task)}`}
                          onClick={() => onOpenTaskDetail(task)}
                          style={{ padding: "7px 9px", cursor: "pointer" }}
                        >
                          <div style={{ fontWeight: 600 }}>{task.title}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>
                            {task.priority} · {task.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DAY VIEW */}
        {calendarView === "day" && (
          <div className="calendar-day-view">
            <div className="calendar-day-view-head">
              <div>
                <h3>
                  Công việc ngày {selectedDate.getDate()} tháng {selectedDate.getMonth() + 1},{" "}
                  {selectedDate.getFullYear()}
                </h3>
                <span>Có {getTasksByDate(selectedDate).length} công việc cần xử lý</span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onQuickAddTaskForDate(formatDate(selectedDate))}
              >
                <Plus size={14} strokeWidth={2} />
                Thêm công việc ngày này
              </button>
            </div>

            <div className="task-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {getTasksByDate(selectedDate).length === 0 ? (
                <div className="empty-state" style={{ padding: "36px 20px" }}>
                  <p>Không có công việc nào có hạn vào ngày này.</p>
                </div>
              ) : (
                getTasksByDate(selectedDate).map((task) => {
                  const done = task.status === "Hoàn thành";
                  return (
                    <div
                      key={task.id}
                      className="task-card"
                      style={{
                        borderLeft: `3px solid ${done ? "var(--success)" : "var(--accent-color)"}`,
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => completeTask(task.id)}
                        className={`task-checkbox ${done ? "checked" : ""}`}
                      >
                        {done && <Check size={12} strokeWidth={2.5} color="#FFFFFF" />}
                      </button>

                      <div className="task-content">
                        <h3
                          className="task-title"
                          style={{
                            cursor: "pointer",
                            textDecoration: done ? "line-through" : "none",
                            color: done ? "var(--text-muted)" : "var(--text-primary)",
                          }}
                          onClick={() => onOpenTaskDetail(task)}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-secondary)" }}>
                            {task.description}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 12, fontSize: 12.5, color: "var(--text-secondary)" }}>
                          <span>
                            Ưu tiên: <strong>{task.priority}</strong>
                          </span>
                          <span>
                            Trạng thái: <strong>{task.status}</strong>
                          </span>
                          <span>
                            Tiến độ: <strong>{task.progress || 0}%</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default CalendarPage;
