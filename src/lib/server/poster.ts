import type { Entry } from "../types";

export function posterSvg(e: Entry): string {
  const p = e.design.palette;
  const W = 1080, H = 1350;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const family = e.design.type.family === "serif" ? "Georgia, 'Times New Roman', serif" : e.design.type.family === "mono" ? "'Courier New', monospace" : "'Helvetica Neue', Arial, sans-serif";
  const title = e.design.type.uppercase ? e.title.toUpperCase() : e.title;
  const words = title.split(" ");
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 14) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const bars = e.musicProfile.envelope
    .map((v, i) => `<rect x="${80 + i * 14.4}" y="${1180 - v * 80}" width="8" height="${Math.max(2, v * 80)}" fill="${p.accent}" opacity="0.85"/>`)
    .join("");
  const swatches = p.swatches.map((c, i) => `<rect x="${80 + i * 70}" y="1230" width="60" height="24" fill="${c}"/>`).join("");
  const angle = e.design.light.angle;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="g" cx="${50 + Math.cos((angle * Math.PI) / 180) * 30}%" cy="${40 + Math.sin((angle * Math.PI) / 180) * 20}%" r="70%"><stop offset="0" stop-color="${p.glow}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.ground}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="${p.ground}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
<text x="80" y="120" font-family="'Courier New', monospace" font-size="22" letter-spacing="4" fill="${p.muted}">${esc(e.day)} · ${esc(e.design.treatment.toUpperCase())} · ${e.musicProfile.bpm} BPM</text>
${lines.map((l, i) => `<text x="80" y="${360 + i * 128}" font-family="${family}" font-size="120" ${e.design.type.italic ? 'font-style="italic"' : ""} font-weight="${e.design.type.weight}" fill="${p.ink}">${esc(l)}</text>`).join("")}
<text x="80" y="${400 + lines.length * 128}" font-family="Georgia, serif" font-size="30" font-style="italic" fill="${p.muted}">${esc(e.analysis.atmosphere)}</text>
${bars}${swatches}
<text x="${W - 80}" y="1250" text-anchor="end" font-family="'Courier New', monospace" font-size="20" fill="${p.muted}">FELT</text>
</svg>`;
}
