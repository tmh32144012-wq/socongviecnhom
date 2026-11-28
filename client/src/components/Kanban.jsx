import React, { useState, useMemo, useDeferredValue, memo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Download, Printer, Plus, AlertTriangle, RotateCcw } from "lucide-react";
import UserAvatar from "./UserAvatar";
import BoardMembersModal from "./BoardMembersModal";
import BoardCollabPanel from "./BoardCollabPanel";
import { exportTasksToCsv, printTasksReportPdf } from "../utils/exportReport";
import "./Kanban.css";

const EMPTY_ARRAY = [];

const COLUMN_COLORS = [
  "#64748b",
  "#0284c7",
  "#0f766e",
  "#b45309",
  "#c2410c",
  "#15803d",
  "#7c3aed",
];

// =====================================================
// SORTABLE KANBAN CARD
// =====================================================
const KanbanCard = memo(function KanbanCard({
  task,
  category,
  onOpenTask,
  onToggleComplete,
  isOverlay = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { task, columnId: task.columnId },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isDone = task.status === "Hoàn thành" || task.progress === 100;

  const isOverdue = useMemo(() => {
    if (!task.dueDate || isDone) return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }, [task.dueDate, isDone]);

  const priorityKey = useMemo(() => {
    const map = {
      "Khẩn cấp": "urgent",
      "Cao": "high",
      "Trung bình": "medium",
      "Thấp": "low",
    };
    return map[task.priority] || "medium";
  }, [task.priority]);

  const assignees = task.assignees || [];
  const stepTotal = task.progressSteps?.length || 0;
  const stepDone = task.progressSteps?.filter((s) => s.completed).length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDone ? "kanban-card-done" : ""} ${
        isOverlay ? "kanban-card-dragging" : ""
      }`}
      {...attributes}
      {...listeners}
      onClick={() => onOpenTask && onOpenTask(task)}
    >
      <div className="kanban-card-header">
        <span className={`badge badge-${priorityKey}`}>
          {task.priority || "Trung bình"}
        </span>

        {category && (
          <span
            className="kanban-card-cat"
            style={{
              background: (category.color || "#0f766e") + "1a",
              color: category.color || "#0f766e",
            }}
          >
            {category.name}
          </span>
        )}

        {(task.labels || []).slice(0, 3).map((lb) => (
          <span
            key={lb.id}
            className="kanban-card-cat"
            style={{
              background: lb.color || "#0f766e",
              color: "#ffffff",
            }}
          >
            {lb.name}
          </span>
        ))}

        {task.recurrence && task.recurrence !== "none" && (
          <span
            className="kanban-card-cat"
            style={{ background: "rgba(14,165,233,0.16)", color: "#38bdf8" }}
            title={`Lặp định kỳ: ${task.recurrence}`}
          >
            ↻ {task.recurrence === "daily" ? "Ngày" : task.recurrence === "weekly" ? "Tuần" : "Tháng"}
          </span>
        )}

        <button
          type="button"
          className={`kanban-card-check ${isDone ? "checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleComplete) onToggleComplete(task.id);
          }}
          title={isDone ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
        >
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </button>
      </div>

      <h4 className="kanban-card-title">{task.title}</h4>

      {task.description && <p className="kanban-card-desc">{task.description}</p>}

      {(stepTotal > 0 || (task.progress || 0) > 0) && (
        <div className="kanban-card-progress">
          <div className="kanban-card-progress-bar">
            <div
              className="kanban-card-progress-fill"
              style={{
                width: `${task.progress || 0}%`,
                backgroundColor: isDone ? "#15803d" : "var(--primary)",
              }}
            />
          </div>
          <span className="kanban-card-progress-text">
            {stepTotal > 0 ? `${stepDone}/${stepTotal}` : `${task.progress || 0}%`}
          </span>
        </div>
      )}

      <div className="kanban-card-footer">
        <div className="kanban-card-meta-left">
          {task.dueDate && (
            <span
              className={`kanban-card-date ${isOverdue ? "date-overdue" : ""}`}
              title={`Hạn chót: ${task.dueDate}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {task.dueDate}
            </span>
          )}

          {(task.commentCount || 0) > 0 && (
            <span className="kanban-card-stat" title={`${task.commentCount} bình luận`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {task.commentCount}
            </span>
          )}

          {(task.attachmentCount || 0) > 0 && (
            <span className="kanban-card-stat" title={`${task.attachmentCount} tệp đính kèm`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {task.attachmentCount}
            </span>
          )}
        </div>

        {assignees.length > 0 && (
          <div className="kanban-card-assignees">
            {assignees.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="kanban-card-assignee-item"
                title={`Phụ trách: ${member.name}`}
              >
                <UserAvatar avatar={member.avatar} name={member.name} size={23} />
              </div>
            ))}
            {assignees.length > 3 && (
              <div
                className="member-avatar-extra"
                style={{ width: 23, height: 23, fontSize: 9.5 }}
              >
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// =====================================================
// DYNAMIC KANBAN COLUMN
// =====================================================
function KanbanColumn({
  column,
  colIndex,
  totalColumns,
  tasks,
  categories,
  isAdmin,
  onOpenTask,
  onToggleComplete,
  onQuickCreateTask,
  onOpenFullModal,
  onUpdateColumn,
  onDeleteColumn,
  onMoveColumnOrder,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { columnId: column.id },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color || "#64748b");
  const [editIsDone, setEditIsDone] = useState(Boolean(column.isDone));
  const [editWipLimit, setEditWipLimit] = useState(column.wipLimit ? String(column.wipLimit) : "");

  const wipLimit = column.wipLimit && Number(column.wipLimit) > 0 ? Number(column.wipLimit) : null;
  const isOverWip = Boolean(wipLimit && tasks.length > wipLimit);
  const isAtWip = Boolean(wipLimit && tasks.length === wipLimit);

  const [quickAdding, setQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDueDate, setQuickDueDate] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  const taskIds = useMemo(() => tasks.map((t) => `task-${t.id}`), [tasks]);

  const handleSaveColumnEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    const parsedWip = editWipLimit.trim() ? Math.max(0, Math.min(99, Number(editWipLimit))) : null;
    await onUpdateColumn(column.id, {
      title: editTitle.trim(),
      color: editColor,
      isDone: editIsDone,
      wipLimit: parsedWip && parsedWip > 0 ? parsedWip : null,
    });
    setEditing(false);
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    try {
      setSavingQuick(true);
      await onQuickCreateTask(column.id, quickTitle.trim(), quickDueDate || null);
      setQuickTitle("");
      setQuickDueDate("");
      setQuickAdding(false);
    } finally {
      setSavingQuick(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "kanban-column-over" : ""} ${isOverWip ? "kanban-column-over-wip" : ""}`}
    >
      <div className="kanban-column-header">
        {editing ? (
          <form className="kanban-col-edit-form" onSubmit={handleSaveColumnEdit}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <div className="kanban-col-color-row">
              {COLUMN_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`kanban-col-color-dot ${editColor === hex ? "selected" : ""}`}
                  style={{ background: hex }}
                  onClick={() => setEditColor(hex)}
                />
              ))}
            </div>
            <label className="kanban-wip-input-row">
              <span>Giới hạn WIP (trống = không giới hạn):</span>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="VD: 5"
                value={editWipLimit}
                onChange={(e) => setEditWipLimit(e.target.value)}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={editIsDone}
                onChange={(e) => setEditIsDone(e.target.checked)}
              />
              Đánh dấu là cột Hoàn thành (Done)
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="submit" className="btn btn-primary btn-sm">Lưu</button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditing(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="kanban-column-title">
              <span
                className="kanban-column-dot"
                style={{ background: column.color || "#64748b" }}
              />
              <h3 title={column.title}>{column.title}</h3>
              {column.isDone && <span className="kanban-column-done-tag">Done</span>}
              <span
                className={`kanban-column-count ${isOverWip ? "is-over-wip" : isAtWip ? "is-at-wip" : ""}`}
                title={
                  wipLimit
                    ? `Giới hạn WIP: ${tasks.length}/${wipLimit} thẻ`
                    : `${tasks.length} thẻ công việc`
                }
              >
                {wipLimit ? `${tasks.length}/${wipLimit}` : tasks.length}
              </span>
            </div>

            <div className="kanban-col-actions">
              <button
                type="button"
                className="kanban-col-icon-btn"
                title="Thêm thẻ đầy đủ vào cột này"
                onClick={() => onOpenFullModal(column.id)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                type="button"
                className="kanban-col-icon-btn"
                title="Tùy chọn cột"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>

              {menuOpen && (
                <div className="kanban-col-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(column.title);
                      setEditColor(column.color || "#64748b");
                      setEditIsDone(Boolean(column.isDone));
                      setEditWipLimit(column.wipLimit ? String(column.wipLimit) : "");
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    Sửa tên, màu &amp; WIP Limit
                  </button>
                  {colIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onMoveColumnOrder(column.id, -1);
                        setMenuOpen(false);
                      }}
                    >
                      Di chuyển sang trái
                    </button>
                  )}
                  {colIndex < totalColumns - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onMoveColumnOrder(column.id, 1);
                        setMenuOpen(false);
                      }}
                    >
                      Di chuyển sang phải
                    </button>
                  )}
                  {isAdmin && totalColumns > 1 && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteColumn(column);
                      }}
                    >
                      Xóa cột này
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isOverWip && (
        <div className="kanban-wip-alert" role="status">
          <AlertTriangle size={13} strokeWidth={2} />
          <span>Vượt giới hạn WIP (+{tasks.length - wipLimit} thẻ) — nên xử lý bớt trước khi nhận thêm</span>
        </div>
      )}

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-tasks">
          {tasks.length === 0 ? (
            <div className="kanban-column-empty">
              Kéo thả thẻ vào đây hoặc thêm mới bên dưới
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                category={catMap[task.categoryId]}
                onOpenTask={onOpenTask}
                onToggleComplete={onToggleComplete}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="kanban-col-footer">
        {quickAdding ? (
          <form className="kanban-quick-add-form" onSubmit={handleQuickAddSubmit}>
            <textarea
              rows={2}
              placeholder="Nhập tên thẻ công việc..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAddSubmit(e);
                }
              }}
              autoFocus
            />
            <input
              type="date"
              className="form-input"
              style={{ padding: "5px 8px", fontSize: 12.5 }}
              value={quickDueDate}
              onChange={(e) => setQuickDueDate(e.target.value)}
              title="Hạn chót (tùy chọn)"
            />
            <div className="kanban-quick-add-actions">
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingQuick}>
                  {savingQuick ? "Đang thêm..." : "Thêm thẻ"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setQuickAdding(false);
                    setQuickTitle("");
                  }}
                >
                  Hủy
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11.5 }}
                onClick={() => {
                  setQuickAdding(false);
                  onOpenFullModal(column.id, quickTitle);
                }}
              >
                Chi tiết...
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="kanban-quick-add-trigger"
            onClick={() => setQuickAdding(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm thẻ công việc
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MAIN TEAM KANBAN BOARD COMPONENT
// =====================================================
function Kanban({
  boards = [],
  activeBoardData,
  loadingBoard = false,
  socketConnected = false,
  categories = [],
  currentUser,
  onSelectBoard,
  onGoToBoards,
  onOpenTask,
  onToggleComplete,
  onMoveTask,
  onQuickCreateTask,
  onOpenCreateTaskModal,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onMembersUpdated,
  onLeaveBoard,
  showToast,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const [activeDragTask, setActiveDragTask] = useState(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [collabPanelOpen, setCollabPanelOpen] = useState(false);

  // Add new column state
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [newColColor, setNewColColor] = useState("#0f766e");
  const [newColIsDone, setNewColIsDone] = useState(false);
  const [newColWipLimit, setNewColWipLimit] = useState("");
  const [creatingCol, setCreatingCol] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const board = activeBoardData?.board || null;
  const members = activeBoardData?.members ?? EMPTY_ARRAY;
  const acceptedMembers = useMemo(
    () => members.filter((m) => m.status === "accepted"),
    [members]
  );
  const columns = activeBoardData?.columns ?? EMPTY_ARRAY;
  const boardTasks = activeBoardData?.tasks ?? EMPTY_ARRAY;
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const isAdmin = board?.myRole === "owner" || board?.myRole === "admin";

  const availableLabels = useMemo(() => {
    const map = new Map();
    boardTasks.forEach((t) => {
      (t.labels || []).forEach((lb) => {
        if (lb && !map.has(lb.id)) map.set(lb.id, lb);
      });
    });
    return [...map.values()];
  }, [boardTasks]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      memberFilter !== "all" ||
      priorityFilter !== "all" ||
      labelFilter !== "all" ||
      onlyMyTasks ||
      onlyOverdue
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setMemberFilter("all");
    setPriorityFilter("all");
    setLabelFilter("all");
    setOnlyMyTasks(false);
    setOnlyOverdue(false);
  };

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return boardTasks.filter((task) => {
      if (task.isArchived) return false;

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase().trim();
        const matchText =
          (task.title || "").toLowerCase().includes(q) ||
          (task.description || "").toLowerCase().includes(q);
        if (!matchText) return false;
      }

      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      if (labelFilter !== "all") {
        const hasLabel = (task.labels || []).some((lb) => Number(lb.id) === Number(labelFilter));
        if (!hasLabel) return false;
      }

      if (onlyOverdue) {
        const isDone = task.status === "Hoàn thành" || task.progress === 100;
        if (isDone || !task.dueDate) return false;
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        if (!(due < today)) return false;
      }

      if (onlyMyTasks && currentUser) {
        const assignedToMe = (task.assignees || []).some(
          (a) => Number(a.id) === Number(currentUser.id)
        );
        const createdByMe = Number(task.userId) === Number(currentUser.id);
        if (!assignedToMe && !createdByMe) return false;
      }

      if (memberFilter !== "all") {
        if (memberFilter === "unassigned") {
          if ((task.assignees || []).length > 0) return false;
        } else {
          const hasMember = (task.assignees || []).some(
            (a) => Number(a.id) === Number(memberFilter)
          );
          if (!hasMember) return false;
        }
      }

      return true;
    });
  }, [boardTasks, deferredSearchQuery, priorityFilter, labelFilter, onlyOverdue, onlyMyTasks, memberFilter, currentUser]);

  const tasksByColumn = useMemo(() => {
    const grouped = {};
    columns.forEach((col) => {
      grouped[col.id] = [];
    });

    const firstColId = columns[0]?.id;
    filteredTasks.forEach((task) => {
      const targetColId = grouped[task.columnId] ? task.columnId : firstColId;
      if (targetColId && grouped[targetColId]) {
        grouped[targetColId].push(task);
      }
    });

    Object.keys(grouped).forEach((colId) => {
      grouped[colId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return grouped;
  }, [filteredTasks, columns]);

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  const handleDragStart = (event) => {
    const taskData = event.active.data?.current?.task;
    if (taskData) setActiveDragTask(taskData);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return;

    const draggedTask = active.data?.current?.task;
    if (!draggedTask) return;

    let targetColumnId = null;
    let targetPosition = 0;

    const overIdStr = String(over.id);
    if (overIdStr.startsWith("col-")) {
      targetColumnId = Number(overIdStr.replace("col-", ""));
      const colTasks = (tasksByColumn[targetColumnId] || []).filter(
        (t) => t.id !== draggedTask.id
      );
      targetPosition = colTasks.length;
    } else if (overIdStr.startsWith("task-")) {
      const overTaskId = Number(overIdStr.replace("task-", ""));
      const overTask = boardTasks.find((t) => t.id === overTaskId);
      if (!overTask) return;
      targetColumnId = overTask.columnId;
      const colTasks = (tasksByColumn[targetColumnId] || []).filter(
        (t) => t.id !== draggedTask.id
      );
      const idx = colTasks.findIndex((t) => t.id === overTaskId);
      targetPosition = idx >= 0 ? idx : colTasks.length;
    }

    if (!targetColumnId) return;

    const sameCol = Number(draggedTask.columnId) === Number(targetColumnId);
    const samePos = Number(draggedTask.position ?? 0) === Number(targetPosition);
    if (sameCol && samePos) return;

    await onMoveTask(draggedTask.id, targetColumnId, targetPosition);
  };

  const handleAddColumnSubmit = async (e) => {
    e.preventDefault();
    if (!newColTitle.trim() || !board) return;
    try {
      setCreatingCol(true);
      const parsedWip = newColWipLimit.trim()
        ? Math.max(0, Math.min(99, Number(newColWipLimit)))
        : null;
      await onCreateColumn(board.id, {
        title: newColTitle.trim(),
        color: newColColor,
        isDone: newColIsDone,
        wipLimit: parsedWip && parsedWip > 0 ? parsedWip : null,
      });
      setNewColTitle("");
      setNewColIsDone(false);
      setNewColWipLimit("");
      setAddingColumn(false);
    } finally {
      setCreatingCol(false);
    }
  };

  const handleMoveColumnOrder = async (columnId, direction) => {
    const idx = columns.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const nextOrder = [...columns];
    const [moved] = nextOrder.splice(idx, 1);
    nextOrder.splice(targetIdx, 0, moved);
    await onReorderColumns(
      board.id,
      nextOrder.map((c) => c.id)
    );
  };

  if (loadingBoard) {
    return (
      <div className="kanban-page">
        <div className="skeleton-card" style={{ height: 84 }} />
        <div style={{ display: "flex", gap: 16 }}>
          <div className="skeleton-card" style={{ width: 300, height: 420 }} />
          <div className="skeleton-card" style={{ width: 300, height: 420 }} />
          <div className="skeleton-card" style={{ width: 300, height: 420 }} />
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="card empty-state">
        <div className="empty-state-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="5" height="14" rx="1" />
            <rect x="9.5" y="3" width="5" height="9" rx="1" />
            <rect x="16" y="3" width="5" height="18" rx="1" />
          </svg>
        </div>
        <h3>Chưa chọn không gian làm việc</h3>
        <p>Hãy tạo hoặc chọn một bảng Kanban nhóm để bắt đầu quản lý công việc cùng đồng đội.</p>
        <button type="button" className="btn btn-primary" onClick={onGoToBoards}>
          Mở danh sách không gian làm việc
        </button>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      {/* BOARD TOP HEADER */}
      <div className="kanban-board-topbar">
        <div className="kanban-topbar-left">
          <div
            className="kanban-board-swatch"
            style={{ background: board.coverColor || "#0f766e" }}
          />
          <div className="kanban-board-heading">
            <div className="kanban-board-title-row">
              <h1>{board.name}</h1>
              {boards.length > 1 && (
                <select
                  className="kanban-board-switcher"
                  value={board.id}
                  onChange={(e) => onSelectBoard(Number(e.target.value))}
                  title="Chuyển nhanh sang bảng khác"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      Chuyển bảng: {b.name}
                    </option>
                  ))}
                </select>
              )}
              {socketConnected && (
                <span className="kanban-live-pill" title="Đang đồng bộ thời gian thực qua Socket.io">
                  <span className="kanban-live-dot" />
                  Trực tiếp
                </span>
              )}
            </div>
            {board.description && (
              <p className="kanban-board-subtitle">{board.description}</p>
            )}
          </div>
        </div>

        <div className="kanban-topbar-right">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setCollabPanelOpen(true)}
            title="Chat nhóm, Nhật ký hoạt động & Nhãn chung"
          >
            <MessageSquare size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>Chat &amp; Nhật ký</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              exportTasksToCsv(filteredTasks, `Bang_${board.name}`);
              showToast?.("Đã xuất báo cáo Excel (CSV)!", "success");
            }}
            title="Xuất danh sách thẻ ra file CSV mở bằng Excel"
          >
            <Download size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => printTasksReportPdf(filteredTasks, `Báo Cáo Bảng: ${board.name}`)}
            title="In hoặc lưu báo cáo tiến độ dạng PDF"
          >
            <Printer size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            className="kanban-members-trigger"
            onClick={() => setMembersModalOpen(true)}
          >
            <div className="member-avatar-stack">
              {acceptedMembers.slice(0, 4).map((m) => (
                <div key={m.userId} className="member-avatar-stack-item" title={m.user?.name}>
                  <UserAvatar avatar={m.user?.avatar} name={m.user?.name} size={26} />
                </div>
              ))}
            </div>
            <span>Thành viên ({acceptedMembers.length})</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenCreateTaskModal(board.id, columns[0]?.id || null)}
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>Thêm thẻ mới</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="kanban-filter-bar">
        <div className="kanban-search">
          <span className="kanban-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm thẻ trong bảng này..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="kanban-clear-btn"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        <div className="kanban-filters">
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            aria-label="Lọc theo thành viên"
          >
            <option value="all">Tất cả thành viên</option>
            <option value="unassigned">Chưa gán người</option>
            {acceptedMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Lọc theo mức ưu tiên"
          >
            <option value="all">Mọi độ ưu tiên</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
            <option value="Cao">Cao</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Thấp">Thấp</option>
          </select>

          {availableLabels.length > 0 && (
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              aria-label="Lọc theo nhãn bảng"
            >
              <option value="all">Mọi nhãn</option>
              {availableLabels.map((lb) => (
                <option key={lb.id} value={lb.id}>
                  Nhãn: {lb.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className={`kanban-my-tasks-btn ${onlyMyTasks ? "active" : ""}`}
            onClick={() => setOnlyMyTasks((prev) => !prev)}
          >
            Việc của tôi
          </button>

          <button
            type="button"
            className={`kanban-my-tasks-btn kanban-overdue-btn ${onlyOverdue ? "active" : ""}`}
            onClick={() => setOnlyOverdue((prev) => !prev)}
          >
            Quá hạn
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="kanban-reset-filter-btn"
              onClick={resetAllFilters}
              title={`Đang hiện ${filteredTasks.length}/${boardTasks.length} thẻ`}
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>Xóa lọc ({filteredTasks.length}/{boardTasks.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KANBAN COLUMNS CANVAS */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board-scroll">
          {columns.map((col, idx) => (
            <KanbanColumn
              key={col.id}
              column={col}
              colIndex={idx}
              totalColumns={columns.length}
              tasks={tasksByColumn[col.id] || []}
              categories={categories}
              isAdmin={isAdmin}
              onOpenTask={onOpenTask}
              onToggleComplete={onToggleComplete}
              onQuickCreateTask={(columnId, title, dueDate) =>
                onQuickCreateTask(board.id, columnId, title, dueDate)
              }
              onOpenFullModal={(columnId, prefillTitle = "") =>
                onOpenCreateTaskModal(board.id, columnId, prefillTitle)
              }
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
              onMoveColumnOrder={handleMoveColumnOrder}
            />
          ))}

          {/* ADD NEW COLUMN (TRELLO STYLE) */}
          <div className="kanban-add-column">
            {addingColumn ? (
              <form className="kanban-add-column-box" onSubmit={handleAddColumnSubmit}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tên cột mới (vd: Review, Testing...)"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  autoFocus
                />
                <div className="kanban-col-color-row">
                  {COLUMN_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`kanban-col-color-dot ${newColColor === hex ? "selected" : ""}`}
                      style={{ background: hex }}
                      onClick={() => setNewColColor(hex)}
                    />
                  ))}
                </div>
                <label className="kanban-wip-input-row">
                  <span>Giới hạn WIP (để trống = không giới hạn):</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="VD: 5"
                    value={newColWipLimit}
                    onChange={(e) => setNewColWipLimit(e.target.value)}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={newColIsDone}
                    onChange={(e) => setNewColIsDone(e.target.checked)}
                  />
                  Tự động đánh dấu hoàn thành khi kéo vào cột này
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creatingCol}>
                    {creatingCol ? "Đang tạo..." : "Thêm cột"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColTitle("");
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="kanban-add-column-trigger"
                onClick={() => setAddingColumn(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm cột trạng thái
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragTask ? (
            <KanbanCard
              task={activeDragTask}
              category={catMap[activeDragTask.categoryId]}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* MEMBERS & INVITATIONS MODAL */}
      <BoardMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        board={board}
        members={members}
        currentUser={currentUser}
        onMembersUpdated={onMembersUpdated}
        onLeaveBoard={onLeaveBoard}
        showToast={showToast}
      />

      {/* COLLABORATION DRAWER: GROUP CHAT, ACTIVITY LOG, SHARED BOARD LABELS */}
      <BoardCollabPanel
        isOpen={collabPanelOpen}
        onClose={() => setCollabPanelOpen(false)}
        boardId={board.id}
        boardName={board.name}
        members={members}
        currentUser={currentUser}
        onLabelsChanged={() => onSelectBoard?.(board.id)}
        showToast={showToast}
      />
    </div>
  );
}

export default Kanban;
