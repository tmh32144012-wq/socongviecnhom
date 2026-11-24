import React from "react";
import { useTheme } from "../context/ThemeContext";

function WallpaperLayer() {
  const { wallpaper, wallpaperDim, wallpaperBlur, isGlass } = useTheme();

  if (!wallpaper) return null;

  const effectiveScrimOpacity = isGlass
    ? Math.min(0.65, Math.max(0.04, (wallpaperDim * 0.55) / 100))
    : Math.min(0.88, Math.max(0.08, wallpaperDim / 100));

  return (
    <div className="global-wallpaper-layer" aria-hidden="true">
      <div
        className="global-wallpaper-image"
        style={{
          backgroundImage: `url("${wallpaper.replace(/"/g, '\\"')}")`,
          filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : "none",
        }}
      />
      <div
        className="global-wallpaper-scrim"
        style={{
          opacity: effectiveScrimOpacity,
        }}
      />
    </div>
  );
}

export default WallpaperLayer;
