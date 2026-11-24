import React from 'react';

function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const bgColors = {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        };

        const icons = {
          success: '✓',
          error: '✕',
          warning: '⚠️',
          info: 'ℹ️',
        };

        const bg = bgColors[toast.type] || '#3b82f6';
        const icon = icons[toast.type] || 'ℹ️';

        return (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              position: 'relative',
              overflow: 'hidden',
              pointerEvents: 'auto',
              background: '#ffffff',
              color: '#1f2937',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              borderLeft: `5px solid ${bg}`,
              animation: toast.type === 'error'
                ? 'toastSlideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1), subtleShake 0.35s 0.28s ease'
                : 'toastSlideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              background: bg,
              borderRadius: '0 0 0 10px',
              animation: 'toastProgress 3.5s linear forwards',
            }} />
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: bg,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: '#111827' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toast;
