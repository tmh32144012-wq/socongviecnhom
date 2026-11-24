import React, { useState, useRef, useEffect } from "react";
import { Moon, Sun, Sparkles, Droplets, Check, Palette } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function ThemeQuickMenu() {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    tetEffectsEnabled,
    toggleTetEffects,
    tetWishesEnabled,
    setTetWishesEnabled,
    accentOptions,
  } = useTheme();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const currentAccentObj =
    accentOptions.find((a) => a.id === accent) || accentOptions[0];

  const renderTriggerIcon = () => {
    if (theme === "tet") {
      return <Sparkles size={15} strokeWidth={1.75} style={{ color: "#F97316" }} />;
    }
    if (theme === "glass") {
      return <Droplets size={15} strokeWidth={1.75} style={{ color: "#38BDF8" }} />;
    }
    if (theme === "light") {
      return <Sun size={15} strokeWidth={1.75} />;
    }
    return <Moon size={15} strokeWidth={1.75} />;
  };

  const themeLabel =
    theme === "tet"
      ? "Tết"
      : theme === "glass"
      ? "Kính lỏng"
      : theme === "light"
      ? "Sáng"
      : "Tối";

  return (
    <div className="theme-quick-wrap" ref={containerRef}>
      <button
        type="button"
        className={`theme-quick-trigger ${theme === "tet" ? "is-tet" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Đổi chủ đề & màu nhấn"
        aria-label="Đổi chủ đề và màu nhấn"
        aria-expanded={open}
      >
        {renderTriggerIcon()}
        <span className="theme-quick-label">{themeLabel}</span>
        <span
          className="theme-quick-dot"
          style={{
            background: theme === "tet" ? "#F97316" : currentAccentObj.color,
          }}
        />
      </button>

      {open && (
        <div className="theme-quick-popover">
          <div className="theme-quick-section">
            <div className="theme-quick-title">
              <Palette size={13} strokeWidth={1.75} />
              <span>Chế độ giao diện</span>
            </div>
            <div className="theme-quick-modes">
              <button
                type="button"
                className={`theme-mode-pill ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <Sun size={14} strokeWidth={1.75} />
                <span>Sáng</span>
              </button>
              <button
                type="button"
                className={`theme-mode-pill ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={14} strokeWidth={1.75} />
                <span>Tối</span>
              </button>
              <button
                type="button"
                className={`theme-mode-pill ${theme === "glass" ? "active" : ""}`}
                onClick={() => setTheme("glass")}
              >
                <Droplets size={14} strokeWidth={1.75} />
                <span>Kính lỏng</span>
              </button>
              <button
                type="button"
                className={`theme-mode-pill tet-pill ${theme === "tet" ? "active" : ""}`}
                onClick={() => setTheme("tet")}
              >
                <Sparkles size={14} strokeWidth={1.75} />
                <span>Tết</span>
              </button>
            </div>
          </div>

          <div className="theme-quick-divider" />

          <div className="theme-quick-section">
            <div className="theme-quick-title">
              <span>Màu nhấn (Sáng, Tối &amp; Kính lỏng)</span>
            </div>
            <div className="theme-accent-dots">
              {accentOptions.map((opt) => {
                const isSelected = accent === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`accent-dot-btn ${isSelected ? "selected" : ""}`}
                    style={{ backgroundColor: opt.color }}
                    title={opt.label}
                    aria-label={`Chọn màu nhấn ${opt.label}`}
                    onClick={() => {
                      setAccent(opt.id);
                      if (theme === "tet") setTheme("dark");
                    }}
                  >
                    {isSelected && theme !== "tet" && (
                      <Check size={14} strokeWidth={2.5} color="#FFFFFF" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {theme === "tet" && (
            <>
              <div className="theme-quick-divider" />
              <div className="theme-quick-tet-row">
                <span>Bao lì xì rơi (sau nền)</span>
                <button
                  type="button"
                  className={`toggle ${tetEffectsEnabled ? "active" : ""}`}
                  onClick={toggleTetEffects}
                  aria-label="Bật hoặc tắt bao lì xì rơi"
                >
                  <span />
                </button>
              </div>
              <div className="theme-quick-tet-row">
                <span>Câu chúc Tết rơi</span>
                <button
                  type="button"
                  className={`toggle ${tetWishesEnabled ? "active" : ""}`}
                  onClick={() => setTetWishesEnabled(!tetWishesEnabled)}
                  aria-label="Bật hoặc tắt câu chúc Tết rơi"
                >
                  <span />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ThemeQuickMenu;
