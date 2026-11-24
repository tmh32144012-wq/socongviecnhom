import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import UserAvatar from "./UserAvatar";

function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories = [],
  boards = [],
  activeBoardId = null,
  initialData = {},
  showToast,
}) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    startDate: getTodayString(),
    dueDate: getTodayString(),
    description: "",
    categoryId: "",
    priority: "Trung bình",
    status: "Chưa bắt đầu",
    notes: "",
    boardId: "",
    columnId: "",
    assigneeIds: [],
  });

  const [boardColumns, setBoardColumns] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayString();
      const defaultBoardId =
        initialData?.boardId !== undefined && initialData?.boardId !== null
          ? String(initialData.boardId)
          : activeBoardId
          ? String(activeBoardId)
          : "";

      setFormData({
        title: initialData?.title || "",
        startDate: initialData?.startDate || todayStr,
        dueDate: initialData?.dueDate || todayStr,
        description: initialData?.description || "",
        categoryId:
          initialData?.categoryId !== undefined && initialData?.categoryId !== null
            ? String(initialData.categoryId)
            : "",
        priority: initialData?.priority || "Trung bình",
        status: initialData?.status || "Chưa bắt đầu",
        notes: initialData?.notes || "",
        boardId: defaultBoardId,
        columnId: initialData?.columnId ? String(initialData.columnId) : "",
        assigneeIds: Array.isArray(initialData?.assigneeIds) ? initialData.assigneeIds : [],
      });
    }
  }, [isOpen, activeBoardId, initialData]);

  // Fetch selected board's columns & accepted members
  useEffect(() => {
    if (!isOpen || !formData.boardId) {
      setBoardColumns([]);
      setBoardMembers([]);
      return;
    }

    const fetchBoardMeta = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.boardById(formData.boardId), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const cols = data.columns || [];
          const mems = (data.members || []).filter((m) => m.status === "accepted");
          setBoardColumns(cols);
          setBoardMembers(mems);
          setFormData((prev) => {
            const validCol = cols.some((c) => String(c.id) === String(prev.columnId));
            return {
              ...prev,
              columnId: validCol ? prev.columnId : cols[0] ? String(cols[0].id) : "",
            };
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBoardMeta();
  }, [isOpen, formData.boardId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "boardId" ? { columnId: "", assigneeIds: [] } : {}),
    }));
  };

  const toggleAssignee = (uid) => {
    const numId = Number(uid);
    setFormData((prev) => {
      const exists = prev.assigneeIds.includes(numId);
      return {
        ...prev,
        assigneeIds: exists
          ? prev.assigneeIds.filter((id) => id !== numId)
          : [...prev.assigneeIds, numId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast?.("Vui lòng nhập tên công việc!", "error");
      return;
    }
    if (!formData.startDate) {
      showToast?.("Vui lòng chọn ngày bắt đầu!", "error");
      return;
    }
    if (!formData.dueDate) {
      showToast?.("Vui lòng chọn hạn chót (deadline)!", "error");
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.dueDate)) {
      showToast?.("Ngày bắt đầu không được sau ngày kết thúc!", "error");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        title: formData.title.trim(),
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        description: formData.description.trim(),
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        priority: formData.priority || "Trung bình",
        status: formData.status || "Chưa bắt đầu",
        notes: formData.notes.trim(),
        boardId: formData.boardId ? Number(formData.boardId) : null,
        columnId: formData.columnId ? Number(formData.columnId) : null,
        assigneeIds: formData.boardId ? formData.assigneeIds : [],
      });
      onClose();
    } catch (err) {
      showToast?.(err.message || "Không thể tạo công việc", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div className="team-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="team-modal-header">
          <div>
            <h2>Tạo thẻ công việc mới</h2>
            <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Chọn bảng nhóm, cột trạng thái, thành viên phụ trách và hạn chót
            </small>
          </div>
          <button type="button" className="team-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="team-modal-body">
            <div className="form-group">
              <label className="form-label">Tên công việc *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="Ví dụ: Xây dựng màn hình đăng nhập, Kiểm thử API..."
                value={formData.title}
                onChange={handleChange}
                autoFocus
                required
              />
            </div>

            {/* BOARD & COLUMN SELECTION */}
            {boards.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Không gian làm việc (Board)</label>
                  <select
                    name="boardId"
                    className="form-select"
                    value={formData.boardId}
                    onChange={handleChange}
                  >
                    <option value="">Việc cá nhân (không thuộc bảng)</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.boardId && (
                  <div className="form-group">
                    <label className="form-label">Cột trạng thái</label>
                    <select
                      name="columnId"
                      className="form-select"
                      value={formData.columnId}
                      onChange={handleChange}
                    >
                      {boardColumns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* MULTI-MEMBER ASSIGNEE CHIPS */}
            {formData.boardId && boardMembers.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  Gán thành viên phụ trách ({formData.assigneeIds.length} đã chọn)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {boardMembers.map((m) => {
                    const selected = formData.assigneeIds.includes(Number(m.userId));
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleAssignee(m.userId)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "5px 10px 5px 6px",
                          borderRadius: 999,
                          border: selected
                            ? "1.5px solid var(--primary)"
                            : "1px solid var(--border-strong)",
                          background: selected ? "var(--primary-light)" : "var(--surface-2)",
                          color: selected ? "var(--primary)" : "var(--text-primary)",
                          fontSize: 12.5,
                          fontWeight: selected ? 600 : 500,
                          cursor: "pointer",
                        }}
                      >
                        <UserAvatar avatar={m.user?.avatar} name={m.user?.name} size={22} />
                        <span>{m.user?.name}</span>
                        {selected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DATES */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Ngày bắt đầu *</label>
                <input
                  type="date"
                  name="startDate"
                  className="form-input"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hạn chót (Deadline) *</label>
                <input
                  type="date"
                  name="dueDate"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* PRIORITY & CATEGORY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Mức độ ưu tiên</label>
                <select
                  name="priority"
                  className="form-select"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="Thấp">Thấp</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Cao">Cao</option>
                  <option value="Khẩn cấp">Khẩn cấp</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Danh mục / Nhãn</label>
                <select
                  name="categoryId"
                  className="form-select"
                  value={formData.categoryId}
                  onChange={handleChange}
                >
                  <option value="">Không phân loại</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chi tiết</label>
              <textarea
                name="description"
                className="form-textarea"
                rows={3}
                placeholder="Yêu cầu cụ thể hoặc tiêu chí hoàn thành..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ghi chú thêm</label>
              <input
                type="text"
                name="notes"
                className="form-input"
                placeholder="Link tài liệu, lưu ý nội bộ..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="team-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Đang tạo..." : "Tạo công việc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskFormModal;
