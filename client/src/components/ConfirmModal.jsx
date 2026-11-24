import React from 'react';

function ConfirmModal({ isOpen, title, message, confirmText, cancelText, secondaryText, isDanger, onConfirm, onSecondary, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-backdrop-animate" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)',
    }}>
      <div className="modal-card modal-content-animate" style={{
        background: 'var(--card-bg, #ffffff)',
        color: 'var(--text-color, #1f2937)',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: secondaryText ? '490px' : '440px',
        width: '92%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isDanger ? '#fee2e2' : '#e0e7ff',
          color: isDanger ? '#ef4444' : '#4f46e5',
          fontSize: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
        }}>
          {isDanger ? '⚠️' : '❓'}
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '19px', fontWeight: 600 }}>
          {title || "Xác nhận hành động"}
        </h3>

        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px', lineHeight: 1.5 }}>
          {message || "Bạn có chắc chắn muốn thực hiện thao tác này?"}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#f9fafb',
              color: '#374151',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cancelText || "Hủy bỏ"}
          </button>

          {secondaryText && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #c7d2fe',
                background: '#eef2ff',
                color: '#4338ca',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {secondaryText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isDanger ? '#ef4444' : '#4f46e5',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: isDanger
                ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                : '0 2px 8px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {confirmText || "Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
