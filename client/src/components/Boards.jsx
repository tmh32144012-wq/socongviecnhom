import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Mail,
  Pencil,
  Trash2,
  ArrowRight,
  Columns3,
  CheckCircle2,
  X,
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import "./Boards.css";

const BOARD_COLORS = [
  { hex: "#0f766e", label: "Xanh rêu" },
  { hex: "#1d4ed8", label: "Xanh dương" },
  { hex: "#b45309", label: "Hổ phách" },
  { hex: "#c2410c", label: "Đất nung" },
  { hex: "#15803d", label: "Xanh lá" },
  { hex: "#475569", label: "Xám đá" },
  { hex: "#9f1239", label: "Đỏ rượu" },
];

const ROLE_LABELS = {
  owner: "Chủ bảng",
  admin: "Quản trị",
  member: "Thành viên",
};

function Boards({
  boards = [],
  pendingInvitations = [],
  loading = false,
  onSelectBoard,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onRespondInvitation,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("#0f766e");
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(() => {
    const totalTasks = boards.reduce((sum, b) => sum + (b.taskCount || 0), 0);
    const completedTasks = boards.reduce((sum, b) => sum + (b.completedTaskCount || 0), 0);
    return { totalTasks, completedTasks };
  }, [boards]);

  const openCreateModal = () => {
    setEditingBoard(null);
    setName("");
    setDescription("");
    setCoverColor("#0f766e");
    setModalOpen(true);
  };

  const openEditModal = (board, e) => {
    e.stopPropagation();
    setEditingBoard(board);
    setName(board.name || "");
    setDescription(board.description || "");
    setCoverColor(board.coverColor || "#0f766e");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      if (editingBoard) {
        await onUpdateBoard(editingBoard.id, {
          name: name.trim(),
          description: description.trim(),
          coverColor,
        });
      } else {
        await onCreateBoard({
          name: name.trim(),
          description: description.trim(),
          coverColor,
        });
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="boards-page page-enter">
      {/* WORKSPACE HUB HEADER */}
      <div className="boards-header">
        <div>
          <h1>Không gian làm việc nhóm</h1>
          <p>
            Chọn một bảng để vào làm việc Kanban thời gian thực cùng đồng đội, hoặc khởi tạo không gian mới.
          </p>
        </div>

        <div className="boards-header-right">
          <div className="boards-telemetry-pills">
            <span className="boards-telemetry-pill">
              <Columns3 size={13} strokeWidth={1.85} />
              <strong>{boards.length}</strong> bảng
            </span>
            <span className="boards-telemetry-pill">
              <CheckCircle2 size={13} strokeWidth={1.85} />
              <strong>{summary.completedTasks}/{summary.totalTasks}</strong> hoàn thành
            </span>
          </div>

          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={15} strokeWidth={2.2} />
            <span>Tạo không gian mới</span>
          </button>
        </div>
      </div>

      {/* LỜI MỜI ĐANG CHỜ XÁC NHẬN */}
      {pendingInvitations.length > 0 && (
        <div className="invites-banner">
          <div className="invites-banner-title">
            <Mail size={16} strokeWidth={1.9} style={{ color: "#f59e0b" }} />
            <span>Bạn có {pendingInvitations.length} lời mời tham gia không gian làm việc</span>
          </div>

          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="invite-row">
              <div className="invite-row-info">
                <div
                  className="invite-color-tag"
                  style={{ background: inv.coverColor || "#0f766e" }}
                />
                <div>
                  <strong>{inv.name}</strong>
                  <span>
                    Chủ bảng: {inv.owner?.name || "Quản trị viên"} • {inv.memberCount || 1} thành viên • {inv.taskCount || 0} thẻ công việc
                  </span>
                </div>
              </div>
              <div className="invite-row-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onRespondInvitation(inv.id, "accept")}
                >
                  Chấp nhận
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRespondInvitation(inv.id, "decline")}
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DANH SÁCH BOARDS */}
      {loading ? (
        <div className="boards-grid">
          <div className="skeleton-card" style={{ height: 240 }} />
          <div className="skeleton-card" style={{ height: 240 }} />
          <div className="skeleton-card" style={{ height: 240 }} />
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => {
            const total = board.taskCount || 0;
            const completed = board.completedTaskCount || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const members = board.members || [];
            const canEdit = board.myRole === "owner" || board.myRole === "admin";
            const canDelete = board.myRole === "owner";
            const accentHex = board.coverColor || "#0f766e";

            return (
              <div
                key={board.id}
                className="board-card"
                style={{ "--board-color": accentHex }}
                onClick={() => onSelectBoard(board.id)}
              >
                {/* ARCHITECTURAL MINI-KANBAN COVER */}
                <div className="board-card-cover">
                  <div className="board-cover-glow" aria-hidden="true" />
                  <div className="board-mini-kanban" aria-hidden="true">
                    <div className="mini-col">
                      <span className="mini-col-bar" />
                      <span className="mini-card c1" />
                      <span className="mini-card c2" />
                    </div>
                    <div className="mini-col">
                      <span className="mini-col-bar" />
                      <span className="mini-card c3" />
                    </div>
                    <div className="mini-col">
                      <span className="mini-col-bar" />
                      <span className="mini-card c4" />
                      <span className="mini-card c5" />
                    </div>
                  </div>

                  <span className={`board-role-pill board-role-${board.myRole || "member"}`}>
                    {ROLE_LABELS[board.myRole] || "Thành viên"}
                  </span>
                </div>

                <div className="board-card-body">
                  <div className="board-card-top">
                    <h3 className="board-card-title">{board.name}</h3>
                    <span className="board-open-arrow" aria-hidden="true">
                      <ArrowRight size={15} strokeWidth={1.85} />
                    </span>
                  </div>

                  <p className="board-card-desc">
                    {board.description || "Không gian làm việc nhóm theo mô hình bảng Kanban."}
                  </p>

                  <div className="board-card-progress-row">
                    <div className="board-card-progress-meta">
                      <span>{board.columnCount || 3} cột • {total} công việc</span>
                      <strong>{percent}%</strong>
                    </div>
                    <div className="progress-bar-wrap" style={{ height: 6 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: accentHex,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="board-card-footer">
                  <div className="member-avatar-stack" title={`${members.length} thành viên`}>
                    {members.slice(0, 4).map((m) => (
                      <div key={m.userId} className="member-avatar-stack-item" title={m.user?.name}>
                        <UserAvatar avatar={m.user?.avatar} name={m.user?.name} size={26} />
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="member-avatar-extra">+{members.length - 4}</div>
                    )}
                  </div>

                  <div className="board-card-actions">
                    {canEdit && (
                      <button
                        type="button"
                        className="board-icon-btn"
                        title="Chỉnh sửa bảng"
                        onClick={(e) => openEditModal(board, e)}
                      >
                        <Pencil size={14} strokeWidth={1.85} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="board-icon-btn danger"
                        title="Xóa bảng"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBoard(board);
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.85} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* THẺ TẠO MỚI NHANH */}
          <button
            type="button"
            className="board-card board-card-new"
            onClick={openCreateModal}
          >
            <div className="board-card-new-icon">
              <Plus size={22} strokeWidth={2} />
            </div>
            <strong className="board-card-new-title">Tạo không gian làm việc mới</strong>
            <span className="board-card-new-sub">
              Tự động khởi tạo sẵn 3 cột To Do, Doing, Done
            </span>
          </button>
        </div>
      )}

      {/* MODAL TẠO / SỬA BOARD */}
      {modalOpen &&
        createPortal(
          <div className="team-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="team-modal-header">
              <h2>{editingBoard ? "Chỉnh sửa không gian làm việc" : "Tạo không gian làm việc mới"}</h2>
              <button
                type="button"
                className="team-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng hộp thoại"
              >
                <X size={17} strokeWidth={1.85} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="team-modal-body">
                <div className="form-group">
                  <label className="form-label">Tên không gian làm việc *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Đồ án Website Kanban, Nhóm Marketing..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả ngắn</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Mục tiêu hoặc phạm vi công việc của nhóm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Màu nhận diện bảng</label>
                  <div className="color-swatches">
                    {BOARD_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`color-swatch ${coverColor === c.hex ? "selected" : ""}`}
                        style={{ background: c.hex }}
                        title={c.label}
                        onClick={() => setCoverColor(c.hex)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="team-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? "Đang lưu..."
                    : editingBoard
                    ? "Lưu thay đổi"
                    : "Tạo không gian"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Boards;
