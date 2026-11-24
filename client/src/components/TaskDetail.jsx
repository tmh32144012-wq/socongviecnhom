import React, { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import { getSocket } from "../config/socket";
import UserAvatar from "./UserAvatar";
import "./TaskDetail.css";

function TaskDetail({
  selectedTask,
  setSelectedTask,
  categories = [],
  currentUser,
  boardMembers = [],
  boardColumns = [],
  previousPage = "kanban",
  setCurrentPage,
  completeTask,
  deleteTask,
  archiveTask,
  getTaskProgress,
  toggleProgressStep,
  addProgressStep,
  editProgressStep,
  deleteProgressStep,
  updateTask,
  onUpdateAssignees,
  showToast,
  askConfirm,
}) {
  const [newProgressStep, setNewProgressStep] = useState("");
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingStepId, setEditingStepId] = useState(null);
  const [editingStepTitle, setEditingStepTitle] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Local board members & columns if opened outside active Kanban
  const [resolvedMembers, setResolvedMembers] = useState(boardMembers);
  const [resolvedColumns, setResolvedColumns] = useState(boardColumns);
  const [boardLabels, setBoardLabels] = useState([]);
  const [taskActivities, setTaskActivities] = useState([]);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    title: selectedTask?.title || "",
    description: selectedTask?.description || "",
    categoryId: selectedTask?.categoryId || "",
    priority: selectedTask?.priority || "Trung bình",
    status: selectedTask?.status || "Chưa bắt đầu",
    startDate: selectedTask?.startDate || "",
    dueDate: selectedTask?.dueDate || "",
    progress: selectedTask?.progress || 0,
    notes: selectedTask?.notes || "",
  });

  // Load board members & columns if task belongs to a board
  useEffect(() => {
    if (!selectedTask?.boardId) {
      setResolvedMembers([]);
      setResolvedColumns([]);
      return;
    }

    if (boardMembers.length > 0 && Number(boardMembers[0]?.boardId) === Number(selectedTask.boardId)) {
      setResolvedMembers(boardMembers.filter((m) => m.status === "accepted"));
      setResolvedColumns(boardColumns);
      return;
    }

    const loadBoardContext = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.boardById(selectedTask.boardId), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setResolvedMembers((data.members || []).filter((m) => m.status === "accepted"));
          setResolvedColumns(data.columns || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadBoardContext();
  }, [selectedTask?.boardId, boardMembers, boardColumns]);

  // Fetch attachments & comments
  useEffect(() => {
    if (!selectedTask?.id) return;

    const fetchAttachments = async () => {
      try {
        setLoadingAttachments(true);
        const res = await fetch(API_ENDPOINTS.taskAttachments(selectedTask.id), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setAttachments(data.attachments || []);
        }
      } catch (err) {
        console.error("Lỗi lấy tệp đính kèm:", err);
      } finally {
        setLoadingAttachments(false);
      }
    };

    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const res = await fetch(API_ENDPOINTS.taskComments(selectedTask.id), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Lỗi lấy bình luận:", err);
      } finally {
        setLoadingComments(false);
      }
    };

    const fetchActivities = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.taskActivities(selectedTask.id), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setTaskActivities(data.activities || []);
        }
      } catch (_) {}
    };

    const fetchBoardLabels = async () => {
      if (!selectedTask.boardId) {
        setBoardLabels([]);
        return;
      }
      try {
        const res = await fetch(API_ENDPOINTS.boardLabels(selectedTask.boardId), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setBoardLabels(data.labels || []);
        }
      } catch (_) {}
    };

    fetchAttachments();
    fetchComments();
    fetchActivities();
    fetchBoardLabels();
  }, [selectedTask?.id, selectedTask?.boardId]);

  // Realtime comments listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedTask?.id) return;

    const handleCreated = ({ taskId, comment }) => {
      if (Number(taskId) !== Number(selectedTask.id)) return;
      setComments((prev) =>
        prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]
      );
    };

    const handleUpdated = ({ taskId, comment }) => {
      if (Number(taskId) !== Number(selectedTask.id)) return;
      setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
    };

    const handleDeleted = ({ taskId, commentId }) => {
      if (Number(taskId) !== Number(selectedTask.id)) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    socket.on("comment:created", handleCreated);
    socket.on("comment:updated", handleUpdated);
    socket.on("comment:deleted", handleDeleted);

    return () => {
      socket.off("comment:created", handleCreated);
      socket.off("comment:updated", handleUpdated);
      socket.off("comment:deleted", handleDeleted);
    };
  }, [selectedTask?.id]);

  if (!selectedTask) return null;

  const openEditModal = () => {
    setEditFormData({
      title: selectedTask.title || "",
      description: selectedTask.description || "",
      categoryId: selectedTask.categoryId || "",
      priority: selectedTask.priority || "Trung bình",
      status: selectedTask.status || "Chưa bắt đầu",
      startDate: selectedTask.startDate || "",
      dueDate: selectedTask.dueDate || "",
      progress:
        selectedTask.progress !== undefined
          ? selectedTask.progress
          : getTaskProgress(selectedTask),
      notes: selectedTask.notes || "",
    });
    setIsEditingTask(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) {
      showToast?.("Tên công việc không được để trống!", "error");
      return;
    }
    if (
      editFormData.startDate &&
      editFormData.dueDate &&
      new Date(editFormData.startDate) > new Date(editFormData.dueDate)
    ) {
      showToast?.("Ngày bắt đầu không được sau hạn chót!", "error");
      return;
    }

    const updated = await updateTask(selectedTask.id, {
      title: editFormData.title.trim(),
      description: editFormData.description.trim(),
      categoryId: editFormData.categoryId ? Number(editFormData.categoryId) : null,
      priority: editFormData.priority,
      status: editFormData.status,
      startDate: editFormData.startDate || null,
      dueDate: editFormData.dueDate || null,
      progress: Number(editFormData.progress),
      notes: editFormData.notes ? editFormData.notes.trim() : "",
    });
    if (updated) setIsEditingTask(false);
  };

  const handleColumnChange = async (newColId) => {
    if (!newColId) return;
    await updateTask(selectedTask.id, { columnId: Number(newColId) });
  };

  const handleToggleAssignee = async (userId) => {
    const currentIds = (selectedTask.assignees || []).map((a) => Number(a.id));
    const exists = currentIds.includes(Number(userId));
    const nextIds = exists
      ? currentIds.filter((id) => id !== Number(userId))
      : [...currentIds, Number(userId)];

    if (onUpdateAssignees) {
      await onUpdateAssignees(selectedTask.id, nextIds);
    }
  };

  // Comments CRUD
  const handlePostComment = async (e) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setPostingComment(true);
      const res = await fetch(API_ENDPOINTS.taskComments(selectedTask.id), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể đăng bình luận");
      setComments((prev) =>
        prev.some((c) => c.id === data.comment.id) ? prev : [...prev, data.comment]
      );
      setNewComment("");
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setPostingComment(false);
    }
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await fetch(API_ENDPOINTS.commentById(commentId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: editingCommentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể sửa bình luận");
      setComments((prev) => prev.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(API_ENDPOINTS.commentById(commentId), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Không thể xóa bình luận");
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  // Attachments handlers
  const handleUploadFiles = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        showToast?.(`Tệp "${files[i].name}" vượt quá 10MB.`, "error");
        return;
      }
      fd.append("files", files[i]);
    }

    try {
      setUploading(true);
      const res = await fetch(API_ENDPOINTS.taskAttachments(selectedTask.id), {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể tải tệp lên");
      setAttachments((prev) => [...(data.attachments || []), ...prev]);
      showToast?.(data.message || "Đã đính kèm tệp!", "success");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (att) => {
    try {
      const res = await fetch(API_ENDPOINTS.attachmentDownload(att.id), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Không thể tải tệp về");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = att.originalName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  const handleDeleteAttachment = (att) => {
    const doDelete = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.attachmentDelete(att.id), {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Không thể xóa tệp");
        setAttachments((prev) => prev.filter((a) => a.id !== att.id));
        showToast?.("Đã xóa tệp đính kèm!", "success");
      } catch (err) {
        showToast?.(err.message, "error");
      }
    };

    if (askConfirm) {
      askConfirm({
        title: "Xóa tệp đính kèm",
        message: `Xóa tệp "${att.originalName}" khỏi thẻ công việc này?`,
        confirmText: "Xóa tệp",
        isDanger: true,
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatCommentTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const progress =
    selectedTask.progress !== undefined
      ? selectedTask.progress
      : getTaskProgress(selectedTask);
  const steps = selectedTask.progressSteps || [];
  const completedSteps = steps.filter((s) => s.completed).length;
  const isDone = selectedTask.status === "Hoàn thành" || progress === 100;

  const isOverdue = (() => {
    if (!selectedTask.dueDate || isDone) return false;
    const due = new Date(selectedTask.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();

  const priorityKey =
    { "Khẩn cấp": "urgent", Cao: "high", "Trung bình": "medium", Thấp: "low" }[
      selectedTask.priority
    ] || "medium";

  const catObj = categories.find((c) => Number(c.id) === Number(selectedTask.categoryId));
  const assignedIdSet = new Set((selectedTask.assignees || []).map((a) => Number(a.id)));

  return (
    <section className="td-page">
      {/* TOP BAR */}
      <div className="td-topbar">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setSelectedTask(null);
            setCurrentPage(previousPage || (selectedTask.boardId ? "kanban" : "tasks"));
          }}
        >
          ← Quay lại
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openEditModal}>
            Chỉnh sửa thẻ
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => archiveTask(selectedTask.id)}
          >
            Lưu trữ
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => deleteTask(selectedTask.id)}
          >
            Xóa
          </button>
        </div>
      </div>

      {/* TWO-COLUMN CONTENT */}
      <div className="td-grid">
        {/* MAIN LEFT COLUMN */}
        <div className="td-main-card">
          <div className="td-badges">
            {selectedTask.board && (
              <span className="td-board-chip">
                <span
                  className="td-board-chip-dot"
                  style={{ background: selectedTask.board.coverColor || "#0f766e" }}
                />
                {selectedTask.board.name}
              </span>
            )}
            <span className={`badge badge-${priorityKey}`}>{selectedTask.priority}</span>
            <span className={`badge ${isDone ? "badge-completed" : isOverdue ? "badge-overdue" : "badge-inprogress"}`}>
              {isOverdue ? "Quá hạn" : selectedTask.status}
            </span>
            {catObj && (
              <span
                className="badge"
                style={{
                  background: (catObj.color || "#0f766e") + "1a",
                  color: catObj.color || "#0f766e",
                }}
              >
                {catObj.name}
              </span>
            )}
          </div>

          <h1 className="td-title">{selectedTask.title}</h1>

          {/* DESCRIPTION */}
          <div className="td-section">
            <h3 className="td-section-title">Mô tả công việc</h3>
            <div className="td-description-box">
              {selectedTask.description || "Chưa có mô tả chi tiết cho thẻ này."}
            </div>
          </div>

          {selectedTask.notes && (
            <div className="td-section">
              <h3 className="td-section-title">Ghi chú bổ sung</h3>
              <div className="td-notes-box">{selectedTask.notes}</div>
            </div>
          )}

          {/* CHECKLIST / SUB-TASKS */}
          <div className="td-section">
            <div className="td-section-title">
              <span>Danh sách bước thực hiện ({completedSteps}/{steps.length})</span>
              <span style={{ fontSize: 13, color: "var(--primary)" }}>{progress}%</span>
            </div>

            <div className="progress-bar-wrap" style={{ marginBottom: 14 }}>
              <div
                className={`progress-bar-fill ${progress === 100 ? "success" : ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {steps.map((step) => (
              <div key={step.id} className={`td-step-row ${step.completed ? "done" : ""}`}>
                <button
                  type="button"
                  className={`td-step-check ${step.completed ? "checked" : ""}`}
                  onClick={() => toggleProgressStep(selectedTask.id, step.id)}
                >
                  {step.completed && "✓"}
                </button>

                {editingStepId === step.id ? (
                  <div style={{ flex: 1, display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: 13 }}
                      value={editingStepTitle}
                      onChange={(e) => setEditingStepTitle(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        if (!editingStepTitle.trim()) return;
                        await editProgressStep(selectedTask.id, step.id, editingStepTitle.trim());
                        setEditingStepId(null);
                      }}
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingStepId(null)}
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="td-step-label">{step.title}</span>
                    <button
                      type="button"
                      className="td-comment-link"
                      onClick={() => {
                        setEditingStepId(step.id);
                        setEditingStepTitle(step.title);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="td-comment-link danger"
                      onClick={() => deleteProgressStep(selectedTask.id, step.id)}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </div>
            ))}

            <form
              style={{ display: "flex", gap: 8, marginTop: 10 }}
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newProgressStep.trim()) return;
                await addProgressStep(selectedTask.id, newProgressStep.trim());
                setNewProgressStep("");
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Thêm bước thực hiện mới..."
                value={newProgressStep}
                onChange={(e) => setNewProgressStep(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                Thêm bước
              </button>
            </form>
          </div>

          {/* ATTACHMENTS */}
          <div className="td-section">
            <div className="td-section-title">
              <span>Tệp đính kèm ({attachments.length})</span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleUploadFiles}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Đang tải lên..." : "+ Tải tệp lên"}
                </button>
              </div>
            </div>

            {loadingAttachments ? (
              <p className="text-muted text-sm">Đang tải danh sách tệp...</p>
            ) : attachments.length === 0 ? (
              <p className="text-muted text-sm">Chưa có tệp đính kèm nào.</p>
            ) : (
              <div className="td-attachment-list">
                {attachments.map((att) => (
                  <div key={att.id} className="td-attachment-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="td-attachment-name">{att.originalName}</div>
                      <div className="td-attachment-meta">{formatFileSize(att.fileSize)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadAttachment(att)}
                      >
                        Tải về
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteAttachment(att)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TEAM COMMENTS */}
          <div className="td-section">
            <h3 className="td-section-title">
              <span>Trao đổi & Bình luận ({comments.length})</span>
            </h3>

            {loadingComments ? (
              <p className="text-muted text-sm">Đang tải bình luận...</p>
            ) : comments.length === 0 ? (
              <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
                Chưa có bình luận nào. Hãy để lại trao đổi đầu tiên cho cả nhóm.
              </p>
            ) : (
              <div className="td-comments-list">
                {comments.map((c) => {
                  const isMine = Number(c.userId) === Number(currentUser?.id);
                  return (
                    <div key={c.id} className="td-comment-item">
                      <UserAvatar avatar={c.author?.avatar} name={c.author?.name} size={32} />
                      <div className="td-comment-bubble">
                        <div className="td-comment-head">
                          <span className="td-comment-author">
                            {c.author?.name || "Thành viên"}
                          </span>
                          <span className="td-comment-time">
                            {formatCommentTime(c.createdAt)}
                          </span>
                        </div>

                        {editingCommentId === c.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              autoFocus
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveCommentEdit(c.id)}
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="td-comment-text">{c.content}</p>
                            {isMine && (
                              <div className="td-comment-actions">
                                <button
                                  type="button"
                                  className="td-comment-link"
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditingCommentText(c.content);
                                  }}
                                >
                                  Chỉnh sửa
                                </button>
                                <button
                                  type="button"
                                  className="td-comment-link danger"
                                  onClick={() => handleDeleteComment(c.id)}
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* COMMENT COMPOSER */}
            {resolvedMembers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>Nhắc tên (@mention):</span>
                {resolvedMembers
                  .filter((m) => Number(m.userId) !== Number(currentUser?.id))
                  .slice(0, 5)
                  .map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "2px 8px", fontSize: 11.5 }}
                      onClick={() => setNewComment((prev) => `${prev}${prev ? " " : ""}@${m.user?.name} `)}
                    >
                      @{m.user?.name}
                    </button>
                  ))}
              </div>
            )}

            <form className="td-comment-composer" onSubmit={handlePostComment}>
              <UserAvatar avatar={currentUser?.avatar} name={currentUser?.name} size={32} />
              <div className="td-comment-composer-box">
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Viết bình luận trao đổi cùng nhóm... (Ctrl + Enter để gửi)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={postingComment || !newComment.trim()}
                  >
                    {postingComment ? "Đang gửi..." : "Gửi bình luận"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* TASK ACTIVITY LOG (Lịch sử thay đổi thẻ) */}
          <div className="td-section" style={{ marginTop: 18 }}>
            <h3 className="td-section-title">Lịch sử hoạt động thẻ ({taskActivities.length})</h3>
            {taskActivities.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Chưa có lịch sử hoạt động ghi nhận.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {taskActivities.slice(0, 12).map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "var(--bg-input)",
                      fontSize: 12.5,
                    }}
                  >
                    <span>{act.summary}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 11, whiteSpace: "nowrap" }}>
                      {new Date(act.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR METADATA & ASSIGNEES */}
        <aside className="td-side-card">
          <button
            type="button"
            className={`btn ${isDone ? "btn-secondary" : "btn-primary"} w-full`}
            onClick={() => completeTask(selectedTask.id, false)}
          >
            {isDone ? "Mở lại công việc" : "Đánh dấu hoàn thành"}
          </button>

          <button
            type="button"
            className="btn btn-secondary w-full"
            style={{ marginTop: 8 }}
            onClick={() => {
              const link = `${window.location.origin}/tasks/${selectedTask.id}`;
              navigator.clipboard?.writeText(link);
              showToast?.("Đã sao chép đường dẫn trực tiếp tới thẻ công việc!", "success");
            }}
          >
            🔗 Sao chép link thẻ
          </button>

          {/* RECURRENCE SELECTOR (Công việc lặp định kỳ) */}
          <div className="td-side-block">
            <span className="td-side-label">Lặp lại định kỳ</span>
            <select
              className="form-select"
              value={selectedTask.recurrence || "none"}
              onChange={async (e) => {
                const nextRec = e.target.value;
                await updateTask(selectedTask.id, { recurrence: nextRec });
                setSelectedTask((prev) => (prev ? { ...prev, recurrence: nextRec } : prev));
              }}
            >
              <option value="none">Không lặp lại</option>
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>

          {/* SHARED BOARD LABELS PICKER */}
          {selectedTask.boardId && boardLabels.length > 0 && (
            <div className="td-side-block">
              <span className="td-side-label">Nhãn chung của Bảng</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {boardLabels.map((lb) => {
                  const activeIds = (selectedTask.labels || []).map((l) => l.id);
                  const isSelected = activeIds.includes(lb.id);
                  return (
                    <button
                      key={lb.id}
                      type="button"
                      onClick={async () => {
                        const nextIds = isSelected
                          ? activeIds.filter((id) => id !== lb.id)
                          : [...activeIds, lb.id];
                        const res = await fetch(API_ENDPOINTS.taskLabels(selectedTask.id), {
                          method: "PUT",
                          headers: getAuthHeaders({ "Content-Type": "application/json" }),
                          body: JSON.stringify({ labelIds: nextIds }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.task) setSelectedTask(data.task);
                          showToast?.("Đã cập nhật nhãn công việc!", "success");
                        }
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: isSelected ? "2px solid #fff" : "1px solid transparent",
                        background: lb.color,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: isSelected ? 1 : 0.48,
                        cursor: "pointer",
                      }}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {lb.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLUMN SWITCHER IF BOARD TASK */}
          {resolvedColumns.length > 0 && (
            <div className="td-side-block">
              <span className="td-side-label">Cột trạng thái Kanban</span>
              <select
                className="form-select"
                value={selectedTask.columnId || ""}
                onChange={(e) => handleColumnChange(e.target.value)}
              >
                {resolvedColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* MULTI-MEMBER ASSIGNEE PICKER */}
          {selectedTask.boardId && resolvedMembers.length > 0 && (
            <div className="td-side-block">
              <span className="td-side-label">
                Thành viên phụ trách ({assignedIdSet.size})
              </span>
              <div className="td-assignee-picker">
                {resolvedMembers.map((m) => {
                  const selected = assignedIdSet.has(Number(m.userId));
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      className={`td-assignee-option ${selected ? "selected" : ""}`}
                      onClick={() => handleToggleAssignee(m.userId)}
                    >
                      <UserAvatar avatar={m.user?.avatar} name={m.user?.name} size={26} />
                      <span className="truncate">{m.user?.name}</span>
                      {selected && <span className="td-assignee-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DEADLINE & METADATA */}
          <div className="td-side-block">
            <span className="td-side-label">Thông tin & Hạn chót</span>
            <div className="td-meta-list">
              <div className="td-meta-row">
                <span className="td-meta-key">Ngày bắt đầu</span>
                <span className="td-meta-val">{selectedTask.startDate || "Chưa đặt"}</span>
              </div>
              <div className="td-meta-row">
                <span className="td-meta-key">Hạn chót (Deadline)</span>
                <span
                  className="td-meta-val"
                  style={{ color: isOverdue ? "var(--danger)" : "inherit" }}
                >
                  {selectedTask.dueDate || "Chưa đặt"}
                  {isOverdue ? " (Quá hạn)" : ""}
                </span>
              </div>
              <div className="td-meta-row">
                <span className="td-meta-key">Người tạo</span>
                <span className="td-meta-val">
                  {selectedTask.creator?.name || currentUser?.name || "Người dùng"}
                </span>
              </div>
              <div className="td-meta-row">
                <span className="td-meta-key">Cập nhật gần nhất</span>
                <span className="td-meta-val">
                  {selectedTask.updatedAt
                    ? new Date(selectedTask.updatedAt).toLocaleDateString("vi-VN")
                    : "Hôm nay"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* EDIT TASK MODAL */}
      {isEditingTask && (
        <div className="team-modal-backdrop" onClick={() => setIsEditingTask(false)}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="team-modal-header">
              <h2>Chỉnh sửa thông tin thẻ</h2>
              <button
                type="button"
                className="team-modal-close"
                onClick={() => setIsEditingTask(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="team-modal-body">
                <div className="form-group">
                  <label className="form-label">Tên công việc *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.title}
                    onChange={(e) =>
                      setEditFormData((p) => ({ ...p, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Ngày bắt đầu</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editFormData.startDate}
                      onChange={(e) =>
                        setEditFormData((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hạn chót (Deadline)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editFormData.dueDate}
                      onChange={(e) =>
                        setEditFormData((p) => ({ ...p, dueDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Độ ưu tiên</label>
                    <select
                      className="form-select"
                      value={editFormData.priority}
                      onChange={(e) =>
                        setEditFormData((p) => ({ ...p, priority: e.target.value }))
                      }
                    >
                      <option value="Thấp">Thấp</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Cao">Cao</option>
                      <option value="Khẩn cấp">Khẩn cấp</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Danh mục</label>
                    <select
                      className="form-select"
                      value={editFormData.categoryId}
                      onChange={(e) =>
                        setEditFormData((p) => ({ ...p, categoryId: e.target.value }))
                      }
                    >
                      <option value="">Không phân loại</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="team-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingTask(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default TaskDetail;
