function generateCaptchaCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateCaptchaSVG(text) {
  const width = 240;
  const height = 58;
  const chars = String(text || "").split("");
  const uid = Math.random().toString(36).slice(2, 7);

  // Subtle curved Bezier interference waves (modern anti-OCR without ugly harsh rainbow bars)
  const waveColors = ["#38bdf8", "#34d399", "#818cf8"];
  let waves = "";
  for (let i = 0; i < 3; i++) {
    const yStart = 12 + Math.floor(Math.random() * (height - 24));
    const yCtrl1 = 6 + Math.floor(Math.random() * (height - 12));
    const yCtrl2 = 6 + Math.floor(Math.random() * (height - 12));
    const yEnd = 12 + Math.floor(Math.random() * (height - 24));
    const stroke = waveColors[i % waveColors.length];
    waves += `<path d="M -6 ${yStart} C 75 ${yCtrl1}, 165 ${yCtrl2}, ${width + 6} ${yEnd}" fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" opacity="0.28"/>`;
  }

  // Fine atmospheric dust dots
  let dots = "";
  for (let i = 0; i < 22; i++) {
    const cx = Math.floor(Math.random() * (width - 12)) + 6;
    const cy = Math.floor(Math.random() * (height - 10)) + 5;
    const r = (Math.random() * 1.15 + 0.55).toFixed(2);
    const dotColors = ["#94a3b8", "#38bdf8", "#34d399", "#a5b4fc"];
    const fill = dotColors[i % dotColors.length];
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.32"/>`;
  }

  // High-contrast, clean geometric monospace glyphs with gentle tilt
  const glyphPalette = ["#f8fafc", "#7dd3fc", "#6ee7b7", "#e0e7ff", "#fde68a", "#bae6fd"];
  let textNodes = "";
  const padX = 24;
  const stepX = (width - padX * 2) / Math.max(chars.length, 1);

  chars.forEach((char, idx) => {
    const cx = Math.round(padX + stepX * idx + stepX * 0.5 + (Math.random() * 4 - 2));
    const cy = Math.round(37 + (Math.random() * 5 - 2.5));
    const rotate = Math.floor(Math.random() * 20) - 10;
    const fill = glyphPalette[(idx + Math.floor(Math.random() * 2)) % glyphPalette.length];
    const fontSize = 26 + Math.floor(Math.random() * 3);
    textNodes += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${fill}" font-size="${fontSize}" font-weight="800" font-family="'JetBrains Mono','Cascadia Code','Consolas','Segoe UI',monospace" filter="url(#glow_${uid})" transform="rotate(${rotate}, ${cx}, ${cy})">${char}</text>`;
  });

  // Subtle decorative foreground slash for OCR hardening without harming readability
  const fgY1 = 16 + Math.floor(Math.random() * 26);
  const fgY2 = 16 + Math.floor(Math.random() * 26);
  const fgWave = `<path d="M 10 ${fgY1} Q ${width / 2} ${Math.floor(height / 2 + (Math.random() * 14 - 7))}, ${width - 10} ${fgY2}" fill="none" stroke="#e2e8f0" stroke-width="1.05" stroke-dasharray="4 5" opacity="0.22"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" style="display:block;width:100%;height:100%;user-select:none;">
    <defs>
      <linearGradient id="bg_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b1324"/>
        <stop offset="52%" stop-color="#111f36"/>
        <stop offset="100%" stop-color="#0d2331"/>
      </linearGradient>
      <radialGradient id="orb1_${uid}" cx="18%" cy="22%" r="65%">
        <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb2_${uid}" cx="84%" cy="82%" r="65%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid_${uid}" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.1"/>
      </pattern>
      <filter id="glow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#020617" flood-opacity="0.65"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg_${uid})"/>
    <rect width="100%" height="100%" fill="url(#orb1_${uid})"/>
    <rect width="100%" height="100%" fill="url(#orb2_${uid})"/>
    <rect width="100%" height="100%" fill="url(#grid_${uid})"/>
    ${waves}
    ${dots}
    ${textNodes}
    ${fgWave}
  </svg>`;
}

module.exports = {
  generateCaptchaCode,
  generateCaptchaSVG,
};
