import React, { useState, useEffect } from "react";
import UserAvatar from "./UserAvatar";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

const ROLE_LABELS = {
  owner: "Chủ bảng",
  admin: "Quản trị viên",
  member: "Thành viên",
};

function BoardMembersModal({
  isOpen,
  onClose,
  board,
  members = [],
  currentUser,
  onMembersUpdated,
  onLeaveBoard,
  showToast,
}) {
  const [emailInput, setEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteMode, setInviteMode] = useState("invite"); // 'invite' | 'direct'
  const [searchResults, setSearchResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = board?.myRole === "owner";
  const isAdmin = board?.myRole === "owner" || board?.myRole === "admin";

  useEffect(() => {
    if (!isOpen || !board?.id || !isAdmin) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          API_ENDPOINTS.boardSearchUsers(board.id, emailInput.trim()),
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [emailInput, isOpen, board?.id, isAdmin, members.length]);

  if (!isOpen || !board) return null;

  const handleInviteSubmit = async (e, overrideEmail) => {
    if (e) e.preventDefault();
    const targetEmail = (overrideEmail || emailInput).trim();
    if (!targetEmail) {
      showToast?.("Vui lòng nhập email thành viên cần mời.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.boardMembers(board.id), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: targetEmail,
          role: inviteRole,
          mode: inviteMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể thêm thành viên");

      setEmailInput("");
      if (data.members && onMembersUpdated) onMembersUpdated(data.members);
      showToast?.(data.message || "Thành công!", "success");
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      const res = await fetch(API_ENDPOINTS.boardMemberById(board.id, memberId), {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể đổi vai trò");

      if (data.members && onMembersUpdated) onMembersUpdated(data.members);
      showToast?.("Đã cập nhật vai trò thành viên.", "success");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  const handleRemoveMember = async (member) => {
    const isSelf = Number(member.userId) === Number(currentUser?.id);
    try {
      const res = await fetch(API_ENDPOINTS.boardMemberById(board.id, member.id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể xóa thành viên");

      showToast?.(data.message, "info");
      if (isSelf) {
        onClose();
        onLeaveBoard?.(board.id);
      } else if (data.members && onMembersUpdated) {
        onMembersUpdated(data.members);
      }
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div className="team-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="team-modal-header">
          <div>
            <h2>Thành viên — {board.name}</h2>
            <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              {members.filter((m) => m.status === "accepted").length} thành viên đang hoạt động
            </small>
          </div>
          <button type="button" className="team-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="team-modal-body">
          {isAdmin && (
            <form onSubmit={handleInviteSubmit} style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Mời hoặc thêm thành viên qua Email
              </label>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Nhập email người dùng (vd: khoa@example.com)..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Đang gửi..." : inviteMode === "direct" ? "Thêm ngay" : "Gửi lời mời"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  className="form-select"
                  style={{ width: "auto", padding: "6px 32px 6px 10px", fontSize: 13 }}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="member">Vai trò: Thành viên</option>
                  <option value="admin">Vai trò: Quản trị viên</option>
                </select>

                <select
                  className="form-select"
                  style={{ width: "auto", padding: "6px 32px 6px 10px", fontSize: 13 }}
                  value={inviteMode}
                  onChange={(e) => setInviteMode(e.target.value)}
                >
                  <option value="invite">Gửi lời mời (chờ xác nhận)</option>
                  <option value="direct">Thêm trực tiếp vào bảng</option>
                </select>
              </div>

              {searchResults.length > 0 && (
                <div className="member-search-results">
                  {searchResults.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="member-search-option"
                      onClick={() => handleInviteSubmit(null, u.email)}
                    >
                      <UserAvatar avatar={u.avatar} name={u.name} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.email}</div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                        + Chọn
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          <div>
            <span className="form-label">Danh sách thành viên ({members.length})</span>
            <div className="members-list">
              {members.map((m) => {
                const isSelf = Number(m.userId) === Number(currentUser?.id);
                return (
                  <div key={m.id} className="member-row">
                    <div className="member-row-left">
                      <UserAvatar avatar={m.user?.avatar} name={m.user?.name} size={34} />
                      <div className="member-row-info">
                        <div className="member-row-name">
                          <span>{m.user?.name}</span>
                          {isSelf && (
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                              (Bạn)
                            </span>
                          )}
                          {m.status === "pending" && (
                            <span className="member-pending-tag">Chờ xác nhận</span>
                          )}
                        </div>
                        <div className="member-row-email">{m.user?.email}</div>
                      </div>
                    </div>

                    <div className="member-row-right">
                      {isOwner && m.role !== "owner" ? (
                        <select
                          className="form-select"
                          style={{ width: "auto", padding: "5px 28px 5px 8px", fontSize: 12.5 }}
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                        >
                          <option value="member">Thành viên</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                      ) : (
                        <span className={`board-role-pill board-role-${m.role}`}>
                          {ROLE_LABELS[m.role] || "Thành viên"}
                        </span>
                      )}

                      {m.role !== "owner" && (isAdmin || isSelf) && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveMember(m)}
                        >
                          {isSelf ? "Rời bảng" : "Gỡ"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="team-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardMembersModal;
