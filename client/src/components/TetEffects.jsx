import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import "./TetEffects.css";

// Bao lì xì rơi phía sau giao diện (strict z-index: 0, KHÔNG che nút hay thẻ)
const ENVELOPE_SEEDS = [
  { left: 5, scale: 0.9, delay: 0, duration: 17, sway: 4.4, drift: 26, opacity: 0.55 },
  { left: 15, scale: 0.78, delay: -5.2, duration: 21, sway: 5.0, drift: -22, opacity: 0.45 },
  { left: 26, scale: 0.95, delay: -10.5, duration: 18.5, sway: 4.6, drift: 30, opacity: 0.52 },
  { left: 37, scale: 0.82, delay: -2.8, duration: 22.5, sway: 5.3, drift: -26, opacity: 0.42 },
  { left: 48, scale: 0.92, delay: -13.4, duration: 19, sway: 4.5, drift: 22, opacity: 0.5 },
  { left: 59, scale: 0.8, delay: -7.6, duration: 21.5, sway: 5.1, drift: -28, opacity: 0.44 },
  { left: 69, scale: 0.96, delay: -1.4, duration: 18, sway: 4.3, drift: 28, opacity: 0.54 },
  { left: 79, scale: 0.84, delay: -11.9, duration: 20.5, sway: 4.9, drift: -24, opacity: 0.46 },
  { left: 89, scale: 0.9, delay: -6.1, duration: 19.5, sway: 4.7, drift: -20, opacity: 0.52 },
  { left: 95, scale: 0.76, delay: -15.3, duration: 23, sway: 5.4, drift: -18, opacity: 0.4 },
  { left: 21, scale: 0.85, delay: -16.8, duration: 20, sway: 4.8, drift: 24, opacity: 0.46 },
  { left: 63, scale: 0.88, delay: -14.2, duration: 21, sway: 5.0, drift: -22, opacity: 0.48 },
];

// Câu chúc Tết rơi nhẹ nhàng ở lớp nền phía sau
const WISH_SEEDS = [
  { text: "An Khang Thịnh Vượng", left: 10, delay: -1.5, duration: 23, drift: 20, opacity: 0.48 },
  { text: "Vạn Sự Như Ý", left: 28, delay: -9.2, duration: 21, drift: -18, opacity: 0.46 },
  { text: "Công Thành Danh Toại", left: 46, delay: -4.8, duration: 24, drift: 22, opacity: 0.44 },
  { text: "Phát Tài Phát Lộc", left: 64, delay: -14.5, duration: 22, drift: -20, opacity: 0.48 },
  { text: "Thuận Buồm Xuôi Gió", left: 80, delay: -7.1, duration: 25, drift: -16, opacity: 0.45 },
  { text: "Sức Khỏe Dồi Dào", left: 18, delay: -17.3, duration: 23.5, drift: 16, opacity: 0.42 },
  { text: "Tấn Tài Tấn Lộc", left: 54, delay: -19.0, duration: 22.5, drift: -18, opacity: 0.44 },
  { text: "Chúc Mừng Năm Mới", left: 73, delay: -12.4, duration: 24.5, drift: 18, opacity: 0.46 },
];

function LuckyEnvelopeSvg() {
  return (
    <svg viewBox="0 0 36 48" width="32" height="42" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="32"
        height="42"
        rx="5"
        fill="url(#tetEnvGrad)"
        stroke="#FDBA74"
        strokeWidth="1.2"
      />
      <path
        d="M2.5 12 C11 19, 25 19, 33.5 12"
        stroke="#FED7AA"
        strokeWidth="1.2"
        fill="rgba(255, 237, 213, 0.08)"
      />
      <circle cx="18" cy="21" r="6" fill="#F97316" stroke="#FDE68A" strokeWidth="1.2" />
      <rect x="15.2" y="18.2" width="5.6" height="5.6" rx="1" stroke="#FFF7ED" strokeWidth="1.1" />
      <defs>
        <linearGradient id="tetEnvGrad" x1="2" y1="3" x2="34" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="55%" stopColor="#C2410C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TetEffects() {
  const { isTet, tetEffectsEnabled, tetWishesEnabled, tetDensity, wallpaper } = useTheme();

  const envelopes = useMemo(() => {
    if (tetDensity === "light") return ENVELOPE_SEEDS.slice(0, 6);
    if (tetDensity === "festive") return ENVELOPE_SEEDS;
    return ENVELOPE_SEEDS.slice(0, 9);
  }, [tetDensity]);

  const wishes = useMemo(() => {
    if (tetDensity === "light") return WISH_SEEDS.slice(0, 4);
    if (tetDensity === "festive") return WISH_SEEDS;
    return WISH_SEEDS.slice(0, 6);
  }, [tetDensity]);

  if (!isTet) return null;

  return (
    <div className={`tet-effects-layer ${wallpaper ? "has-wallpaper" : ""}`} aria-hidden="true">
      {/* Nền ánh cam ấm đặt phía sau toàn bộ ứng dụng */}
      {!wallpaper && <div className="tet-ambient-backdrop" />}

      {/* Bao lì xì rơi nhẹ phía sau các thẻ chức năng */}
      {tetEffectsEnabled &&
        envelopes.map((item, idx) => (
          <div
            key={`env-${idx}`}
            className="tet-envelope"
            style={{
              left: `${item.left}%`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              "--env-drift": `${item.drift}px`,
              "--env-opacity": item.opacity,
              "--env-scale": item.scale,
            }}
          >
            <span
              className="tet-envelope-inner"
              style={{ animationDuration: `${item.sway}s` }}
            >
              <LuckyEnvelopeSvg />
            </span>
          </div>
        ))}

      {/* Câu chúc Tết rơi dịu nhẹ ở lớp nền phía sau */}
      {tetWishesEnabled &&
        wishes.map((w, idx) => (
          <div
            key={`wish-${idx}`}
            className="tet-wish-drop"
            style={{
              left: `${w.left}%`,
              animationDuration: `${w.duration}s`,
              animationDelay: `${w.delay}s`,
              "--wish-drift": `${w.drift}px`,
              "--wish-opacity": w.opacity,
            }}
          >
            <span className="tet-wish-pill">{w.text}</span>
          </div>
        ))}
    </div>
  );
}

export default TetEffects;
