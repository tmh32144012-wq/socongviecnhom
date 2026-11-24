import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export const THEME_STORAGE_KEY = "app-theme";
export const ACCENT_STORAGE_KEY = "app-accent";
export const TET_EFFECTS_STORAGE_KEY = "app-tet-effects";
export const TET_WISHES_STORAGE_KEY = "app-tet-wishes";
export const TET_DENSITY_STORAGE_KEY = "app-tet-density";
export const GLASS_TONE_STORAGE_KEY = "app-glass-tone";
export const GLASS_BLUR_STORAGE_KEY = "app-glass-blur-v2";
export const GLASS_OPACITY_STORAGE_KEY = "app-glass-opacity-v2";
export const GLASS_MOTION_STORAGE_KEY = "app-glass-motion";
export const LIGHT_TONE_STORAGE_KEY = "app-light-tone";
export const DARK_TONE_STORAGE_KEY = "app-dark-tone";
export const UI_RADIUS_STORAGE_KEY = "app-ui-radius";
export const WALLPAPER_STORAGE_KEY = "app-wallpaper";
export const WALLPAPER_DIM_STORAGE_KEY = "app-wallpaper-dim";
export const WALLPAPER_BLUR_STORAGE_KEY = "app-wallpaper-blur";

const svgToDataUri = (svg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

export const WALLPAPER_PRESETS = [
  {
    id: "midnight-peaks",
    label: "Núi đêm Graphite",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stop-color="#0b1220"/>
            <stop offset="55%" stop-color="#17253b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="glow" cx="72%" cy="24%" r="42%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.34"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sky)"/>
        <rect width="1600" height="900" fill="url(#glow)"/>
        <path d="M0 640 L260 470 L520 590 L820 390 L1140 560 L1410 430 L1600 530 L1600 900 L0 900 Z" fill="#131f33" opacity="0.82"/>
        <path d="M0 720 L310 580 L610 680 L940 500 L1270 650 L1600 560 L1600 900 L0 900 Z" fill="#0d1524" opacity="0.92"/>
        <path d="M0 800 L420 690 L860 770 L1260 660 L1600 740 L1600 900 L0 900 Z" fill="#090f1a"/>
      </svg>
    `),
  },
  {
    id: "emerald-horizon",
    label: "Chân trời Lục bảo",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#071618"/>
            <stop offset="50%" stop-color="#0c2628"/>
            <stop offset="100%" stop-color="#09131c"/>
          </linearGradient>
          <radialGradient id="aurora1" cx="28%" cy="28%" r="48%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="aurora2" cx="76%" cy="38%" r="45%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.24"/>
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect width="1600" height="900" fill="url(#aurora1)"/>
        <rect width="1600" height="900" fill="url(#aurora2)"/>
        <path d="M0 680 Q400 570 820 660 T1600 610 L1600 900 L0 900 Z" fill="#081a1e" opacity="0.88"/>
        <path d="M0 770 Q460 700 960 760 T1600 720 L1600 900 L0 900 Z" fill="#061015"/>
      </svg>
    `),
  },
  {
    id: "topo-blueprint",
    label: "Địa hình Công nghệ",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0d1321"/>
            <stop offset="100%" stop-color="#141e33"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#g)"/>
        <g fill="none" stroke="#60a5fa" stroke-opacity="0.16" stroke-width="1.5">
          <path d="M-80 220 C240 120 420 340 760 240 S1280 120 1680 260"/>
          <path d="M-80 310 C260 210 460 430 800 330 S1300 210 1680 350"/>
          <path d="M-80 400 C280 300 500 520 840 420 S1320 300 1680 440"/>
          <path d="M-80 490 C300 390 540 610 880 510 S1340 390 1680 530"/>
          <path d="M-80 580 C320 480 580 700 920 600 S1360 480 1680 620"/>
          <path d="M-80 670 C340 570 620 790 960 690 S1380 570 1680 710"/>
          <path d="M-80 760 C360 660 660 880 1000 780 S1400 660 1680 800"/>
        </g>
        <circle cx="1220" cy="240" r="240" fill="#3b82f6" opacity="0.1"/>
        <circle cx="340" cy="680" r="280" fill="#6366f1" opacity="0.09"/>
      </svg>
    `),
  },
  {
    id: "warm-dusk",
    label: "Hoàng hôn Hổ phách",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="dusk" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stop-color="#1c1215"/>
            <stop offset="48%" stop-color="#3a1f1b"/>
            <stop offset="100%" stop-color="#161116"/>
          </linearGradient>
          <radialGradient id="sun" cx="68%" cy="32%" r="44%">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0.34"/>
            <stop offset="60%" stop-color="#d97706" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#dusk)"/>
        <rect width="1600" height="900" fill="url(#sun)"/>
        <path d="M0 660 L340 540 L720 630 L1120 490 L1600 610 L1600 900 L0 900 Z" fill="#231417" opacity="0.85"/>
        <path d="M0 760 L480 680 L980 750 L1600 660 L1600 900 L0 900 Z" fill="#140c0f"/>
      </svg>
    `),
  },
  {
    id: "nordic-mist",
    label: "Sương sáng Bắc Âu",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#e8eef7"/>
            <stop offset="50%" stop-color="#f3f6fb"/>
            <stop offset="100%" stop-color="#dfe8f4"/>
          </linearGradient>
          <radialGradient id="b1" cx="20%" cy="20%" r="50%">
            <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#93c5fd" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="b2" cx="82%" cy="76%" r="50%">
            <stop offset="0%" stop-color="#a5b4fc" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="#a5b4fc" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#m)"/>
        <rect width="1600" height="900" fill="url(#b1)"/>
        <rect width="1600" height="900" fill="url(#b2)"/>
        <path d="M0 680 Q440 590 900 670 T1600 630 L1600 900 L0 900 Z" fill="#cbd8ec" opacity="0.45"/>
      </svg>
    `),
  },
  {
    id: "tet-orange-glow",
    label: "Sắc Cam Ngày Tết",
    value: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a0e09"/>
            <stop offset="52%" stop-color="#2e160c"/>
            <stop offset="100%" stop-color="#160b07"/>
          </linearGradient>
          <radialGradient id="tg" cx="76%" cy="24%" r="48%">
            <stop offset="0%" stop-color="#f97316" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#t)"/>
        <rect width="1600" height="900" fill="url(#tg)"/>
        <circle cx="1220" cy="210" r="110" fill="none" stroke="#fb923c" stroke-opacity="0.24" stroke-width="1.5"/>
        <path d="M0 700 Q460 610 920 690 T1600 640 L1600 900 L0 900 Z" fill="#22110a" opacity="0.88"/>
        <path d="M0 790 Q520 730 1040 785 T1600 750 L1600 900 L0 900 Z" fill="#130906"/>
      </svg>
    `),
  },
];

export const THEME_OPTIONS = [
  {
    id: "light",
    label: "Sáng",
    description: "Giấy sáng tinh gọn, tương phản sắc nét dễ tập trung",
    previewBg: "#F4F5F7",
    previewCard: "#FFFFFF",
    previewBorder: "#CBD3E0",
  },
  {
    id: "dark",
    label: "Tối",
    description: "Xám xanh Graphite trầm sâu, dịu mắt khi làm việc lâu",
    previewBg: "#10131A",
    previewCard: "#171B24",
    previewBorder: "rgba(214, 224, 245, 0.16)",
  },
  {
    id: "glass",
    label: "Kính lỏng",
    description: "Kính trong suốt phản xạ ánh sáng cùng sóng nền mềm mượt",
    previewBg: "linear-gradient(135deg, #0b162c 0%, #102a43 52%, #153448 100%)",
    previewCard: "rgba(255, 255, 255, 0.16)",
    previewBorder: "rgba(255, 255, 255, 0.34)",
  },
  {
    id: "tet",
    label: "Tết",
    description: "Tông cam ấm rộn ràng với bao lì xì và câu chúc rơi phía sau",
    previewBg: "#180E0A",
    previewCard: "#26160F",
    previewBorder: "rgba(249, 115, 22, 0.42)",
  },
];

export const ACCENT_OPTIONS = [
  { id: "blue", label: "Xanh dương", color: "#2563EB", hover: "#1D4ED8" },
  { id: "emerald", label: "Xanh ngọc", color: "#0F9D68", hover: "#0B7F54" },
  { id: "indigo", label: "Tím chàm", color: "#4F46E5", hover: "#4338CA" },
  { id: "orange", label: "Cam đất", color: "#EA580C", hover: "#C2410C" },
  { id: "rose", label: "Hồng trầm", color: "#D12553", hover: "#AE1B42" },
];

export const LIGHT_TONE_OPTIONS = [
  { id: "alabaster", label: "Trắng sáng", swatch: "#F4F5F7" },
  { id: "cool", label: "Xám lạnh", swatch: "#EBF0F7" },
  { id: "warm", label: "Giấy ấm", swatch: "#F6F2EA" },
];

export const DARK_TONE_OPTIONS = [
  { id: "graphite", label: "Graphite", swatch: "#10131A" },
  { id: "obsidian", label: "Đêm sâu", swatch: "#090C12" },
  { id: "navy", label: "Xanh đêm", swatch: "#0C1424" },
];

export const GLASS_TONE_OPTIONS = [
  { id: "ocean", label: "Cực quang Xanh", swatch: "linear-gradient(135deg, #0ea5e9, #2563eb)" },
  { id: "crystal", label: "Thạch anh Tím", swatch: "linear-gradient(135deg, #6366f1, #38bdf8)" },
  { id: "emerald", label: "Ngọc Lục bảo", swatch: "linear-gradient(135deg, #10b981, #0ea5e9)" },
  { id: "sunset", label: "Hoàng hôn Cam", swatch: "linear-gradient(135deg, #f97316, #ec4899)" },
];

export const UI_RADIUS_OPTIONS = [
  { id: "sharp", label: "Sắc cạnh", value: "6px" },
  { id: "balanced", label: "Cân bằng", value: "11px" },
  { id: "soft", label: "Mềm mại", value: "16px" },
];

const VALID_THEMES = new Set(["dark", "light", "glass", "tet"]);
const VALID_ACCENTS = new Set(["emerald", "blue", "indigo", "orange", "rose"]);
const VALID_LIGHT_TONES = new Set(["alabaster", "cool", "warm"]);
const VALID_DARK_TONES = new Set(["graphite", "obsidian", "navy"]);
const VALID_GLASS_TONES = new Set(["ocean", "crystal", "emerald", "sunset"]);
const VALID_DENSITIES = new Set(["light", "medium", "festive"]);
const VALID_RADII = new Set(["sharp", "balanced", "soft"]);

function readStored(key, validSet, fallback) {
  try {
    const val = localStorage.getItem(key);
    if (val && validSet.has(val)) return val;
    return fallback;
  } catch {
    return fallback;
  }
}

function readStoredBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function readStoredNumber(key, fallback, min, max) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  } catch {
    return fallback;
  }
}

function readInitialWallpaper() {
  try {
    return localStorage.getItem(WALLPAPER_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function applyThemeAttributes({
  theme,
  accent,
  hasWallpaper,
  lightTone,
  darkTone,
  glassTone,
  glassBlur,
  glassOpacity,
  uiRadius,
}) {
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-accent", accent);
  root.setAttribute("data-has-wallpaper", hasWallpaper ? "true" : "false");
  root.setAttribute("data-light-tone", lightTone);
  root.setAttribute("data-dark-tone", darkTone);
  root.setAttribute("data-glass-tone", glassTone);
  root.setAttribute("data-radius", uiRadius);

  const radiusMap = { sharp: "6px", balanced: "11px", soft: "16px" };
  root.style.setProperty("--ui-radius", radiusMap[uiRadius] || "11px");
  root.style.setProperty("--glass-blur", `${glassBlur}px`);

  const alpha = glassOpacity / 100;
  const sidebarAlpha = Math.max(0.03, alpha * 0.82);
  const columnAlpha = Math.max(0.02, alpha * 0.62);
  const sheenTop = Math.min(0.22, 0.07 + alpha * 0.24);
  const sheenMid = Math.min(0.1, 0.025 + alpha * 0.12);
  const modalAlpha = Math.min(0.56, 0.14 + alpha * 0.85);

  root.style.setProperty("--glass-surface-alpha", alpha.toFixed(3));
  root.style.setProperty("--glass-sidebar-alpha", sidebarAlpha.toFixed(3));
  root.style.setProperty("--glass-column-alpha", columnAlpha.toFixed(3));
  root.style.setProperty("--glass-sheen-top", sheenTop.toFixed(3));
  root.style.setProperty("--glass-sheen-mid", sheenMid.toFixed(3));
  root.style.setProperty("--glass-modal-alpha", modalAlpha.toFixed(3));

  const usesDarkSurface = theme === "dark" || theme === "tet" || theme === "glass";
  root.classList.toggle("dark-theme", usesDarkSurface);
  if (body) {
    body.classList.toggle("dark-theme", usesDarkSurface);
    body.setAttribute("data-theme", theme);
    body.setAttribute("data-accent", accent);
    body.setAttribute("data-has-wallpaper", hasWallpaper ? "true" : "false");
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    readStored(THEME_STORAGE_KEY, VALID_THEMES, "light")
  );
  const [accent, setAccentState] = useState(() =>
    readStored(ACCENT_STORAGE_KEY, VALID_ACCENTS, "blue")
  );
  const [uiRadius, setUiRadiusState] = useState(() =>
    readStored(UI_RADIUS_STORAGE_KEY, VALID_RADII, "balanced")
  );
  const [lightTone, setLightToneState] = useState(() =>
    readStored(LIGHT_TONE_STORAGE_KEY, VALID_LIGHT_TONES, "alabaster")
  );
  const [darkTone, setDarkToneState] = useState(() =>
    readStored(DARK_TONE_STORAGE_KEY, VALID_DARK_TONES, "graphite")
  );
  const [glassTone, setGlassToneState] = useState(() =>
    readStored(GLASS_TONE_STORAGE_KEY, VALID_GLASS_TONES, "ocean")
  );
  const [glassBlur, setGlassBlurState] = useState(() =>
    readStoredNumber(GLASS_BLUR_STORAGE_KEY, 16, 4, 34)
  );
  const [glassOpacity, setGlassOpacityState] = useState(() =>
    readStoredNumber(GLASS_OPACITY_STORAGE_KEY, 14, 4, 50)
  );
  const [glassMotion, setGlassMotionState] = useState(() =>
    readStoredBool(GLASS_MOTION_STORAGE_KEY, true)
  );
  const [tetEffectsEnabled, setTetEffectsEnabledState] = useState(() =>
    readStoredBool(TET_EFFECTS_STORAGE_KEY, true)
  );
  const [tetWishesEnabled, setTetWishesEnabledState] = useState(() =>
    readStoredBool(TET_WISHES_STORAGE_KEY, true)
  );
  const [tetDensity, setTetDensityState] = useState(() =>
    readStored(TET_DENSITY_STORAGE_KEY, VALID_DENSITIES, "medium")
  );
  const [wallpaper, setWallpaperState] = useState(readInitialWallpaper);
  const [wallpaperDim, setWallpaperDimState] = useState(() =>
    readStoredNumber(WALLPAPER_DIM_STORAGE_KEY, 45, 10, 85)
  );
  const [wallpaperBlur, setWallpaperBlurState] = useState(() =>
    readStoredNumber(WALLPAPER_BLUR_STORAGE_KEY, 0, 0, 16)
  );

  useEffect(() => {
    applyThemeAttributes({
      theme,
      accent,
      hasWallpaper: Boolean(wallpaper),
      lightTone,
      darkTone,
      glassTone,
      glassBlur,
      glassOpacity,
      uiRadius,
    });
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem("theme", theme === "light" ? "Sáng" : "Tối");
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
      localStorage.setItem(UI_RADIUS_STORAGE_KEY, uiRadius);
      localStorage.setItem(LIGHT_TONE_STORAGE_KEY, lightTone);
      localStorage.setItem(DARK_TONE_STORAGE_KEY, darkTone);
      localStorage.setItem(GLASS_TONE_STORAGE_KEY, glassTone);
      localStorage.setItem(GLASS_BLUR_STORAGE_KEY, String(glassBlur));
      localStorage.setItem(GLASS_OPACITY_STORAGE_KEY, String(glassOpacity));
      localStorage.setItem(GLASS_MOTION_STORAGE_KEY, String(glassMotion));
      localStorage.setItem(TET_EFFECTS_STORAGE_KEY, String(tetEffectsEnabled));
      localStorage.setItem(TET_WISHES_STORAGE_KEY, String(tetWishesEnabled));
      localStorage.setItem(TET_DENSITY_STORAGE_KEY, tetDensity);
      localStorage.setItem(WALLPAPER_DIM_STORAGE_KEY, String(wallpaperDim));
      localStorage.setItem(WALLPAPER_BLUR_STORAGE_KEY, String(wallpaperBlur));
    } catch {
      // ignore storage errors
    }
  }, [
    theme,
    accent,
    wallpaper,
    lightTone,
    darkTone,
    glassTone,
    glassBlur,
    glassOpacity,
    glassMotion,
    uiRadius,
    tetEffectsEnabled,
    tetWishesEnabled,
    tetDensity,
    wallpaperDim,
    wallpaperBlur,
  ]);

  const setTheme = useCallback((next) => {
    if (VALID_THEMES.has(next)) setThemeState(next);
  }, []);

  const setAccent = useCallback((next) => {
    if (VALID_ACCENTS.has(next)) setAccentState(next);
  }, []);

  const setUiRadius = useCallback((next) => {
    if (VALID_RADII.has(next)) setUiRadiusState(next);
  }, []);

  const setLightTone = useCallback((next) => {
    if (VALID_LIGHT_TONES.has(next)) setLightToneState(next);
  }, []);

  const setDarkTone = useCallback((next) => {
    if (VALID_DARK_TONES.has(next)) setDarkToneState(next);
  }, []);

  const setGlassTone = useCallback((next) => {
    if (VALID_GLASS_TONES.has(next)) setGlassToneState(next);
  }, []);

  const setGlassBlur = useCallback((val) => {
    const parsed = Number(val);
    setGlassBlurState(Math.min(34, Math.max(4, Number.isNaN(parsed) ? 16 : parsed)));
  }, []);

  const setGlassOpacity = useCallback((val) => {
    const parsed = Number(val);
    setGlassOpacityState(Math.min(50, Math.max(4, Number.isNaN(parsed) ? 14 : parsed)));
  }, []);

  const setGlassMotion = useCallback((enabled) => {
    setGlassMotionState(Boolean(enabled));
  }, []);

  const setTetEffectsEnabled = useCallback((enabled) => {
    setTetEffectsEnabledState(Boolean(enabled));
  }, []);

  const toggleTetEffects = useCallback(() => {
    setTetEffectsEnabledState((prev) => !prev);
  }, []);

  const setTetWishesEnabled = useCallback((enabled) => {
    setTetWishesEnabledState(Boolean(enabled));
  }, []);

  const setTetDensity = useCallback((next) => {
    if (VALID_DENSITIES.has(next)) setTetDensityState(next);
  }, []);

  const setWallpaper = useCallback((nextWallpaper) => {
    const normalized = typeof nextWallpaper === "string" ? nextWallpaper.trim() : "";
    try {
      if (normalized) {
        localStorage.setItem(WALLPAPER_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(WALLPAPER_STORAGE_KEY);
      }
      setWallpaperState(normalized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearWallpaper = useCallback(() => {
    try {
      localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    } catch {
      // ignore
    }
    setWallpaperState("");
  }, []);

  const setWallpaperDim = useCallback((val) => {
    setWallpaperDimState(Math.min(85, Math.max(10, Number(val) || 45)));
  }, []);

  const setWallpaperBlur = useCallback((val) => {
    setWallpaperBlurState(Math.min(16, Math.max(0, Number(val) || 0)));
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "glass";
      if (prev === "glass") return "tet";
      return "light";
    });
  }, []);

  const value = {
    theme,
    setTheme,
    cycleTheme,
    isDark: theme === "dark" || theme === "tet" || theme === "glass",
    isTet: theme === "tet",
    isGlass: theme === "glass",
    accent,
    setAccent,
    uiRadius,
    setUiRadius,
    lightTone,
    setLightTone,
    darkTone,
    setDarkTone,
    glassTone,
    setGlassTone,
    glassBlur,
    setGlassBlur,
    glassOpacity,
    setGlassOpacity,
    glassMotion,
    setGlassMotion,
    tetEffectsEnabled,
    setTetEffectsEnabled,
    toggleTetEffects,
    tetWishesEnabled,
    setTetWishesEnabled,
    tetDensity,
    setTetDensity,
    wallpaper,
    setWallpaper,
    clearWallpaper,
    wallpaperDim,
    setWallpaperDim,
    wallpaperBlur,
    setWallpaperBlur,
    wallpaperPresets: WALLPAPER_PRESETS,
    themeOptions: THEME_OPTIONS,
    accentOptions: ACCENT_OPTIONS,
    lightToneOptions: LIGHT_TONE_OPTIONS,
    darkToneOptions: DARK_TONE_OPTIONS,
    glassToneOptions: GLASS_TONE_OPTIONS,
    uiRadiusOptions: UI_RADIUS_OPTIONS,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

export default ThemeContext;
