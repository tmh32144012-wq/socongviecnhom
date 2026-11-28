import React, { useId } from "react";
import "./BrandLogo.css";

export const BRAND_NAME = "KanoFlow";
export const BRAND_TAGLINE = "Không gian Kanban Đội nhóm";

function BrandMarkSvg({ size = 34 }) {
  const uid = useId().replace(/:/g, "");
  const bgGrad = `kf-bg-${uid}`;
  const flowGrad = `kf-flow-${uid}`;
  const barGrad = `kf-bar-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="kf-emblem-svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgGrad} x1="4" y1="3" x2="37" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--kf-grad-start, var(--accent-color, #2563EB))" />
          <stop offset="58%" stopColor="var(--kf-grad-mid, var(--accent-hover, #1D4ED8))" />
          <stop offset="100%" stopColor="var(--kf-grad-end, #0EA5E9)" />
        </linearGradient>
        <linearGradient id={barGrad} x1="8" y1="9" x2="32" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id={flowGrad} x1="8" y1="27" x2="33" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
      </defs>

      {/* Architectural squircle frame */}
      <rect x="2" y="2" width="36" height="36" rx="10.5" fill={`url(#${bgGrad})`} />
      {/* Subtle top specular glass rim */}
      <rect
        x="2.6"
        y="2.6"
        width="34.8"
        height="34.8"
        rx="9.9"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="1.2"
      />
      <path
        d="M8 4.2H32"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* 3 Precision Kanban columns */}
      <rect x="9" y="10" width="5.4" height="19.5" rx="2.4" fill={`url(#${barGrad})`} />
      <rect x="17.3" y="10" width="5.4" height="13.5" rx="2.4" fill={`url(#${barGrad})`} fillOpacity="0.9" />
      <rect x="25.6" y="10" width="5.4" height="19.5" rx="2.4" fill={`url(#${barGrad})`} fillOpacity="0.38" />

      {/* Kinetic Flow Arc linking columns to completion */}
      <path
        d="M11.6 26.8C15.5 25.4 18.8 21.8 21.6 17.8C23.8 14.7 26.2 13 28.8 12.6"
        stroke={`url(#${flowGrad})`}
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      {/* Luminous completion node */}
      <circle cx="28.4" cy="12.6" r="3.1" fill="#FFFFFF" />
      <circle cx="28.4" cy="12.6" r="1.4" fill="var(--kf-node-core, #0EA5E9)" />
    </svg>
  );
}

function BrandLogo({
  size = "md",
  showText = true,
  subtitle = "",
  animated = false,
  className = "",
  onClick,
}) {
  const iconPx = size === "hero" ? 54 : size === "lg" ? 40 : size === "sm" ? 30 : 34;

  if (size === "hero") {
    const letters = BRAND_NAME.split("");
    return (
      <div className={`kf-hero-lockup ${className}`} onClick={onClick}>
        <div className="kf-hero-emblem-stage">
          <span className="kf-hero-orbit" aria-hidden="true" />
          <span className="kf-hero-glow" aria-hidden="true" />
          <div className="kf-emblem-box is-hero">
            <BrandMarkSvg size={iconPx} />
            <span className="kf-emblem-sheen" aria-hidden="true" />
          </div>
        </div>

        <div className="kf-hero-wordmark-wrap">
          <div className="kf-hero-eyebrow">
            <span className="kf-live-pulse" />
            <span>REALTIME KANBAN SUITE</span>
          </div>

          <div className="kf-hero-wordmark" aria-label={BRAND_NAME}>
            {letters.map((ch, idx) => (
              <span
                key={`${ch}-${idx}`}
                className={`kf-letter ${idx >= 4 ? "is-accent-part" : ""}`}
                style={{ animationDelay: `${70 + idx * 48}ms` }}
              >
                {ch}
              </span>
            ))}
            <span className="kf-wordmark-sweep" aria-hidden="true" />
          </div>

          <div className="kf-hero-underline" aria-hidden="true">
            <span />
          </div>

          {subtitle && <div className="kf-hero-subline">{subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`kf-brand kf-size-${size} ${animated ? "is-animated" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      <div className="kf-emblem-box">
        <BrandMarkSvg size={iconPx} />
        <span className="kf-emblem-sheen" aria-hidden="true" />
      </div>

      {showText && (
        <div className="kf-text-stack">
          <span className="kf-wordmark-inline">
            <span className="kf-part-kano">Kano</span>
            <span className="kf-part-flow">Flow</span>
          </span>
          {subtitle && <span className="kf-sub-inline">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
