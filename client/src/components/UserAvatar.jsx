import React from 'react';

const AVATAR_PALETTE = [
  '#0f766e',
  '#1d4ed8',
  '#b45309',
  '#c2410c',
  '#15803d',
  '#475569',
  '#9f1239',
];

function getNameColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name = 'U') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ avatar, name = 'Người dùng', size = 36, className = '', style = {} }) {
  const isImage = typeof avatar === 'string' && (
    avatar.startsWith('data:image/') ||
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('blob:')
  );

  const initials = getInitials(name);
  const bgColor = getNameColor(name);

  if (isImage) {
    return (
      <div
        className={`user-avatar ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f4',
          border: '1px solid rgba(28, 25, 23, 0.08)',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <img
          src={avatar}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  if (avatar && avatar !== '👤') {
    return (
      <div
        className={`user-avatar ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          background: '#e6f4f1',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(13, Math.round(size * 0.5)),
          lineHeight: 1,
          userSelect: 'none',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        {avatar}
      </div>
    );
  }

  return (
    <div
      className={`user-avatar ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        background: bgColor,
        color: '#ffffff',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1,
        userSelect: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export default UserAvatar;
