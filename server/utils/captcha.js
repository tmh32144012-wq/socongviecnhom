function generateCaptchaCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateCaptchaSVG(text) {
  const width = 160;
  const height = 45;
  const chars = text.split("");

  let lines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 75%)`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" opacity="0.6"/>`;
  }

  let dots = "";
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.random() * 2 + 0.5;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 60%, 70%)`;
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.5"/>`;
  }

  let textNodes = "";
  const charWidth = width / (chars.length + 1);
  chars.forEach((char, idx) => {
    const x = (idx + 1) * charWidth - 6;
    const y = 30 + (Math.random() * 6 - 3);
    const rotate = Math.floor(Math.random() * 26) - 13;
    const colors = ["#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b", "#3b82f6"];
    const color = colors[idx % colors.length];
    const fontSize = 22 + Math.floor(Math.random() * 4);
    textNodes += `<text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: #0f172a; border-radius: 8px; user-select: none;">
    <rect width="100%" height="100%" fill="#1e293b" rx="8"/>
    ${lines}
    ${dots}
    ${textNodes}
  </svg>`;
}

module.exports = {
  generateCaptchaCode,
  generateCaptchaSVG,
};
