import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Archive as ArchiveIcon,
  RotateCcw,
  Trash2,
  CalendarDays,
  Folder,
} from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

function Archive({
  categories,
  onRestoreTask,
  onPermanentDeleteTask,
  getPriorityClass,
  getTaskProgress,
  onOpenTaskDetail,
}) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchArchivedTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.archivedTasks, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedTasks(data);
      }
    } catch (err) {
      console.error("Lỗi lấy công việc lưu trữ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTasks();
  }, []);

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === Number(categoryId));
    return cat ? cat.name : "Chưa phân loại";
  };

  const filteredTasks = archivedTasks.filter((t) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.notes && t.notes.toLowerCase().includes(query))
    );
  });

  const handleRestore = async (id) => {
    const success = await onRestoreTask(id);
    if (success) {
      setArchivedTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleDeletePermanent = async (id) => {
    const success = await onPermanentDeleteTask(id);
    if (success) {
      setArchivedTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <section className="archive-page page-enter">
      {/* HEADER */}
      <header className="header">
        <div>
          <h1>Kho lưu trữ công việc</h1>
          <p>Các công việc đã hoàn thành hoặc tạm cất. Bạn có thể khôi phục hoặc xóa vĩnh viễn.</p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={fetchArchivedTasks}
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <RefreshCw size={14} strokeWidth={1.85} />
          Tải lại ({archivedTasks.length})
        </button>
      </header>

      {/* SEARCH */}
      <div style={{ marginTop: '18px', marginBottom: '20px', maxWidth: '420px', position: 'relative' }}>
        <Search
          size={15}
          strokeWidth={1.75}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Tìm kiếm trong kho lưu trữ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 14px 9px 36px',
            borderRadius: '9px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* TASK LIST */}
      <div className="task-list">
        {loading ? (
          <div className="empty">Đang tải danh sách lưu trữ...</div>
        ) : filteredTasks.length === 0 ? (
          <div
            className="empty"
            style={{
              padding: '48px 24px',
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
              <ArchiveIcon size={22} strokeWidth={1.75} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 650, color: 'var(--text-primary)' }}>
              {search ? "Không tìm thấy kết quả" : "Kho lưu trữ đang trống"}
            </h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              {search
                ? "Không tìm thấy công việc nào phù hợp trong kho lưu trữ."
                : "Các công việc sau khi lưu trữ sẽ xuất hiện tại đây để bạn tra cứu hoặc khôi phục."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                borderLeft: '3px solid var(--text-muted)',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div className="task-content" style={{ minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h3
                    style={{ margin: 0, cursor: 'pointer', color: 'var(--text-primary)' }}
                    onClick={() => onOpenTaskDetail(task)}
                  >
                    {task.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    Đã lưu trữ
                  </span>
                </div>

                {task.description && (
                  <p className="description" style={{ marginBottom: '8px' }}>
                    {task.description}
                  </p>
                )}

                <div className="task-info" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  {task.dueDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <CalendarDays size={13} strokeWidth={1.75} />
                      Hạn: {task.dueDate}
                    </span>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Folder size={13} strokeWidth={1.75} />
                    {getCategoryName(task.categoryId)}
                  </span>
                  <span className={`priority ${getPriorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span>
                    Trạng thái: <strong style={{ color: 'var(--text-primary)' }}>{task.status}</strong>
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    Tiến độ: <strong style={{ color: 'var(--accent-color)' }}>{getTaskProgress(task)}%</strong>
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  className="save-button"
                  onClick={() => handleRestore(task.id)}
                  style={{
                    padding: '8px 13px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'var(--accent-color)',
                    color: 'var(--accent-contrast, #ffffff)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={14} strokeWidth={1.85} />
                  Khôi phục
                </button>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDeletePermanent(task.id)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Xóa vĩnh viễn khỏi hệ thống"
                >
                  <Trash2 size={14} strokeWidth={1.85} />
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Archive;
