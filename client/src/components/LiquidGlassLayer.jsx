import React from "react";
import { useTheme } from "../context/ThemeContext";
import "./LiquidGlassLayer.css";

function LiquidGlassLayer() {
  const { isGlass, glassTone, glassMotion, wallpaper } = useTheme();

  if (!isGlass) return null;

  return (
    <div
      className={`liquid-glass-backdrop tone-${glassTone} ${glassMotion ? "is-animated" : "is-static"} ${
        wallpaper ? "has-wallpaper" : ""
      }`}
      aria-hidden="true"
    >
      <div className="liquid-orb orb-1" />
      <div className="liquid-orb orb-2" />
      <div className="liquid-orb orb-3" />
      <div className="liquid-caustic-sheen" />
    </div>
  );
}

export default LiquidGlassLayer;
