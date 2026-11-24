import React, { useEffect, useState, useRef } from "react";
import { X, MessageSquare, Activity, Tag, Send, Plus, Trash2 } from "lucide-react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import { getSocket } from "../config/socket";
import UserAvatar from "./UserAvatar";
import "./BoardCollabPanel.css";

const LABEL_COLORS = ["#0f766e", "#dc2626", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#15803d"];

/**
 * Panel Cộng tác nhóm ngay trên Bảng Kanban:
 * 1. Phòng Chat chung realtime (có gợi ý @mention thành viên)
 * 2. Nhật ký hoạt động bảng (ActivityLog realtime + phân trang)
 * 3. Quản lý Nhãn dùng chung của Bảng (BoardLabels)
 */
function BoardCollabPanel({
  isOpen,
  onClose,
  boardId,
  boardName,
  members = [],
  currentUser,
  onLabelsChanged,
  showToast,
}) {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [activities, setActivities] = useState([]);
  const [actPage, setActPage] = useState(1);
  const [hasMoreAct, setHasMoreAct] = useState(false);

  const [labels, setLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  const chatEndRef = useRef(null);

  const loadMessages = async () => {
    if (!boardId) return;
    const res = await fetch(API_ENDPOINTS.boardMessages(boardId), { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  };

  const loadActivities = async (page = 1, append = false) => {
    if (!boardId) return;
    const res = await fetch(API_ENDPOINTS.boardActivities(boardId, page, 25), { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setActivities((prev) => (append ? [...prev, ...(data.activities || [])] : data.activities || []));
      setActPage(page);
      setHasMoreAct(Boolean(data.pagination?.hasMore));
    }
  };

  const loadLabels = async () => {
    if (!boardId) return;
    const res = await fetch(API_ENDPOINTS.boardLabels(boardId), { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setLabels(data.labels || []);
    }
  };

  useEffect(() => {
    if (!isOpen || !boardId) return;
    loadMessages();
    loadActivities(1, false);
    loadLabels();
  }, [isOpen, boardId]);

  // Lắng nghe sự kiện realtime từ Socket.io
  useEffect(() => {
    if (!isOpen || !boardId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const onMsg = ({ boardId: bId, message }) => {
      if (Number(bId) !== Number(boardId) || !message) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    };

    const onAct = ({ boardId: bId, activity }) => {
      if (Number(bId) !== Number(boardId) || !activity) return;
      setActivities((prev) => (prev.some((a) => a.id === activity.id) ? prev : [activity, ...prev]));
    };

    const onLabelsUpdated = ({ boardId: bId }) => {
      if (Number(bId) === Number(boardId)) loadLabels();
    };

    socket.on("board:message-new", onMsg);
    socket.on("activity:new", onAct);
    socket.on("board:labels-updated", onLabelsUpdated);

    return () => {
      socket.off("board:message-new", onMsg);
      socket.off("activity:new", onAct);
      socket.off("board:labels-updated", onLabelsUpdated);
    };
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const acceptedMembers = members.filter((m) => m.status === "accepted");

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(API_ENDPOINTS.boardMessages(boardId), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: draft.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
        }
        setDraft("");
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    } finally {
      setSending(false);
    }
  };

  const handleCreateLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const res = await fetch(API_ENDPOINTS.boardLabels(boardId), {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewLabelName("");
      loadLabels();
      onLabelsChanged?.();
      showToast?.(`Đã thêm nhãn chung "${data.label?.name}"`, "success");
    } else {
      showToast?.(data.message || "Không thể tạo nhãn", "error");
    }
  };

  const handleDeleteLabel = async (labelId) => {
    const res = await fetch(API_ENDPOINTS.labelById(labelId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (res.ok) {
      loadLabels();
      onLabelsChanged?.();
      showToast?.("Đã xóa nhãn bảng", "info");
    } else {
      showToast?.(data.message || "Không thể xóa nhãn", "error");
    }
  };

  return (
    <div className="collab-drawer-backdrop" onClick={onClose}>
      <aside className="collab-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="collab-drawer-header">
          <div>
            <h3>Cộng tác — {boardName}</h3>
            <span>{acceptedMembers.length} thành viên đang tham gia</span>
          </div>
          <button type="button" className="collab-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="collab-tabs">
          <button type="button" className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
            <MessageSquare size={14} /> Chat nhóm
          </button>
          <button type="button" className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
            <Activity size={14} /> Nhật ký
          </button>
          <button type="button" className={tab === "labels" ? "active" : ""} onClick={() => setTab("labels")}>
            <Tag size={14} /> Nhãn ({labels.length})
          </button>
        </div>

        {/* TAB 1: CHAT NHÓM REALTIME */}
        {tab === "chat" && (
          <div className="collab-chat-body">
            <div className="collab-chat-list">
              {messages.length === 0 ? (
                <p className="collab-empty">Chưa có tin nhắn nào. Gõ @tên để nhắc thành viên trong bảng!</p>
              ) : (
                messages.map((m) => {
                  const isMine = Number(m.userId) === Number(currentUser?.id);
                  return (
                    <div key={m.id} className={`collab-msg ${isMine ? "mine" : ""}`}>
                      {!isMine && <UserAvatar avatar={m.author?.avatar} name={m.author?.name} size={26} />}
                      <div className="collab-msg-bubble">
                        <div className="collab-msg-meta">
                          <strong>{m.author?.name || "Thành viên"}</strong>
                          <span>{new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p>{m.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {acceptedMembers.length > 1 && (
              <div className="collab-mention-bar">
                <span>Nhắc nhanh:</span>
                {acceptedMembers
                  .filter((m) => Number(m.userId) !== Number(currentUser?.id))
                  .slice(0, 4)
                  .map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => setDraft((d) => `${d}${d ? " " : ""}@${m.user?.name || m.name} `)}
                    >
                      @{m.user?.name || m.name}
                    </button>
                  ))}
              </div>
            )}

            <form className="collab-chat-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Nhắn cho cả nhóm (hỗ trợ @tên)..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" disabled={sending}>
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: NHẬT KÝ HOẠT ĐỘNG */}
        {tab === "activity" && (
          <div className="collab-scroll-body">
            {activities.length === 0 ? (
              <p className="collab-empty">Chưa có nhật ký hoạt động nào trong bảng này.</p>
            ) : (
              <>
                <div className="collab-activity-list">
                  {activities.map((a) => (
                    <div key={a.id} className="collab-activity-item">
                      <UserAvatar avatar={a.actor?.avatar} name={a.actor?.name} size={26} />
                      <div>
                        <p>{a.summary}</p>
                        <span>{new Date(a.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreAct && (
                  <button
                    type="button"
                    className="collab-load-more"
                    onClick={() => loadActivities(actPage + 1, true)}
                  >
                    Tải thêm lịch sử...
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: NHÃN DÙNG CHUNG CỦA BẢNG */}
        {tab === "labels" && (
          <div className="collab-scroll-body">
            <form className="collab-label-form" onSubmit={handleCreateLabel}>
              <input
                type="text"
                placeholder="Tên nhãn chung (VD: Bug, UI/UX, Gấp)..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
              />
              <div className="collab-color-row">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`collab-color-dot ${newLabelColor === c ? "selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setNewLabelColor(c)}
                  />
                ))}
                <button type="submit" className="collab-add-label-btn">
                  <Plus size={14} /> Thêm
                </button>
              </div>
            </form>

            <div className="collab-label-list">
              {labels.length === 0 ? (
                <p className="collab-empty">Chưa có nhãn dùng chung nào cho bảng này.</p>
              ) : (
                labels.map((lb) => (
                  <div key={lb.id} className="collab-label-row">
                    <span className="collab-label-pill" style={{ background: lb.color }}>
                      {lb.name}
                    </span>
                    <button
                      type="button"
                      className="collab-del-btn"
                      onClick={() => handleDeleteLabel(lb.id)}
                      title="Xóa nhãn (Chủ bảng / Quản trị)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default BoardCollabPanel;
