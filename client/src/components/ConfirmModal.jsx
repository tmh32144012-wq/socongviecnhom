import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle } from "lucide-react";

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  secondaryText,
  isDanger,
  onConfirm,
  onSecondary,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && onCancel) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="team-modal-backdrop" onClick={onCancel}>
      <div
        className="team-modal confirm-modal"
        style={{
          maxWidth: secondaryText ? 480 : 430,
          padding: "26px 24px 22px",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: isDanger ? "var(--danger-light)" : "var(--accent-soft)",
            color: isDanger ? "var(--danger)" : "var(--accent-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            border: `1px solid ${isDanger ? "rgba(239, 68, 68, 0.28)" : "var(--accent-ring)"}`,
          }}
        >
          {isDanger ? <AlertTriangle size={24} strokeWidth={1.9} /> : <HelpCircle size={24} strokeWidth={1.9} />}
        </div>

        <h3
          id="confirm-modal-title"
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {title || "Xác nhận hành động"}
        </h3>

        <p
          style={{
            margin: "0 0 22px",
            color: "var(--text-secondary)",
            fontSize: 13.5,
            lineHeight: 1.55,
            whiteSpace: "pre-line",
          }}
        >
          {message || "Bạn có chắc chắn muốn thực hiện thao tác này?"}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText || "Hủy bỏ"}
          </button>

          {secondaryText && onSecondary && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                borderColor: "var(--accent-color)",
                color: "var(--accent-color)",
                background: "var(--accent-soft)",
              }}
              onClick={onSecondary}
            >
              {secondaryText}
            </button>
          )}

          <button
            type="button"
            className={isDanger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
          >
            {confirmText || "Xác nhận"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
