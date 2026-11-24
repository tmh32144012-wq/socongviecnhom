import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import WallpaperLayer from "./components/WallpaperLayer";
import LiquidGlassLayer from "./components/LiquidGlassLayer";
import TetEffects from "./components/TetEffects";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <WallpaperLayer />
      <LiquidGlassLayer />
      <TetEffects />
      <App />
    </ThemeProvider>
  </StrictMode>
);
