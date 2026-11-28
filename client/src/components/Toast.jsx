import React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const TOAST_META = {
  success: {
    color: "var(--success, #10b981)",
    softBg: "var(--success-light, rgba(16, 185, 129, 0.14))",
    Icon: CheckCircle2,
  },
  error: {
    color: "var(--danger, #ef4444)",
    softBg: "var(--danger-light, rgba(239, 68, 68, 0.14))",
    Icon: XCircle,
  },
  warning: {
    color: "var(--warning, #f59e0b)",
    softBg: "var(--warning-light, rgba(245, 158, 11, 0.14))",
    Icon: AlertTriangle,
  },
  info: {
    color: "var(--info, #3b82f6)",
    softBg: "var(--info-light, rgba(59, 130, 246, 0.14))",
    Icon: Info,
  },
};

function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return createPortal(
    <div
      className="toast-container"
      role="region"
      aria-label="Thông báo hệ thống"
      style={{
        position: "fixed",
        top: "18px",
        right: "18px",
        zIndex: 10050,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "380px",
        width: "calc(100vw - 36px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const meta = TOAST_META[toast.type] || TOAST_META.info;
        const IconComp = meta.Icon;

        return (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
            className="toast-item"
            style={{
              position: "relative",
              overflow: "hidden",
              pointerEvents: "auto",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              backdropFilter: "blur(18px) saturate(180%)",
              WebkitBackdropFilter: "blur(18px) saturate(180%)",
              boxShadow: "var(--shadow-lg), var(--surface-highlight)",
              borderRadius: "13px",
              padding: "13px 14px 15px",
              display: "flex",
              alignItems: "flex-start",
              gap: "11px",
              animation:
                toast.type === "error"
                  ? "toastSlideInRight 0.24s cubic-bezier(0.16, 1, 0.3, 1), subtleShake 0.32s 0.26s ease"
                  : "toastSlideInRight 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Bottom live countdown bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: "2.5px",
                background: meta.color,
                borderRadius: "0 2px 2px 0",
                animation: "toastProgress 3.5s linear forwards",
              }}
            />

            {/* Vector icon badge */}
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "9px",
                background: meta.softBg,
                color: meta.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <IconComp size={16} strokeWidth={2.1} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "13.5px",
                    marginBottom: "2px",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {toast.title}
                </div>
              )}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Đóng thông báo"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                width: "26px",
                height: "26px",
                borderRadius: "7px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background-color 0.14s ease, color 0.14s ease",
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

export default Toast;
