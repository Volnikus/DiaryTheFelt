"use client";

import { doodlesFor, tiltFor } from "../doodles";
import { mulberry32 } from "../engine/random";
import { MOOD } from "../moods";
import { BROW, MOUTH } from "../mote-face";
import type { Recap } from "../recap";
import type { DayMood } from "../types";
import { shareImage, type CardFormat } from "./postcard";

/*
 * Weekly and monthly recap cards, drawn as a page of the notebook: graph paper, a red
 * margin with doodles from the week's words, Mote in the colour of the period, taped-in
 * photos, highlighted words and the song on a strip of tape. 4:5 for the feed, 9:16 for
 * Stories (the same page, with Instagram's top and bottom zones left as empty paper).
 */

const W = 1080;
const POST_H = 1350;
const INK = "#1B1F3B", PEN = "#2346B8", MARGIN = "rgba(226,91,85,0.8)", PAPER = "#FFFEFA";
const GRID = "rgba(70,110,190,0.13)", HIGHLIGHT = "rgba(255,228,92,0.85)", TAPE = "rgba(255,236,160,0.82)";
const LEFT = 150, RIGHT = 1010, CONTENT = RIGHT - LEFT;

const FONT = {
  serif: `"Fraunces Variable", Fraunces, Georgia, serif`,
  hand: `Caveat, "Segoe Print", cursive`,
  sans: `"Onest Variable", system-ui, sans-serif`,
};

async function fontsReady() {
  await Promise.all([
    document.fonts?.load(`500 80px ${FONT.serif}`),
    document.fonts?.load(`italic 500 40px ${FONT.serif}`),
    document.fonts?.load(`600 40px ${FONT.hand}`),
    document.fonts?.load(`500 24px ${FONT.sans}`),
  ]).catch(() => {});
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type Ctx = CanvasRenderingContext2D;

function paper(ctx: Ctx, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, h);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = MARGIN;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(118, 0); ctx.lineTo(118, h); ctx.stroke();
}

/** a wobbly ring, the way a ballpoint draws a circle (it overshoots where it started) */
function inkRing(ctx: Ctx, cx: number, cy: number, r: number, rnd: () => number, width = 3) {
  ctx.strokeStyle = PEN;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  const start = rnd() * Math.PI * 2;
  for (let i = 0; i <= 64; i++) {
    const a = start + (i / 60) * Math.PI * 2;
    const rr = r * (1 + (rnd() - 0.5) * 0.035) + (i > 58 ? 2 : 0);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** Mote: a blot of the mood's colour with a face in ink */
function mote(ctx: Ctx, cx: number, cy: number, r: number, color: string, mood: DayMood, rnd: () => number) {
  ctx.save();
  // the paint, a few soft overlapping dabs
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + (rnd() - 0.5) * r * 0.12, cy + (rnd() - 0.5) * r * 0.12, r * (0.92 + rnd() * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.22, r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  inkRing(ctx, cx, cy, r, rnd, Math.max(2, r / 18));
  // face, from the same shapes as the live Mote (drawn in a 120 box centred on 60,62)
  const k = r / 44;
  ctx.translate(cx - 60 * k, cy - 62 * k);
  ctx.scale(k, k);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.6;
  for (const b of BROW[mood]) ctx.stroke(new Path2D(b));
  const open = mood === "radiant" ? 0.55 : 1;
  for (const ex of [45, 75]) { ctx.beginPath(); ctx.ellipse(ex, 58, 3.6, 5.4 * open, 0, 0, Math.PI * 2); ctx.fill(); }
  if (mood === "radiant" || mood === "bright") {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#FF8FA8";
    for (const chx of [34, 86]) { ctx.beginPath(); ctx.arc(chx, 72, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 3;
  ctx.stroke(new Path2D(MOUTH[mood]));
  ctx.restore();
}

function tape(ctx: Ctx, x: number, y: number, w: number, h: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = TAPE;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 4, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + 3);
  ctx.lineTo(w / 2 - 4, 0);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2 + 2, h / 2 - 2);
  ctx.lineTo(-w / 2 - 3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function polaroid(ctx: Ctx, img: HTMLImageElement | null, cx: number, cy: number, size: number, angle: number, rnd: () => number) {
  const pad = size * 0.05, bottom = size * 0.16;
  const w = size + pad * 2, h = size + pad + bottom;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(27,31,59,0.18)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fff";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = "transparent";
  const x = -w / 2 + pad, y = -h / 2 + pad;
  if (img) {
    const r = Math.max(size / img.width, size / img.height);
    const sw = size / r, sh = size / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, size, size);
  } else {
    ctx.fillStyle = "#EEE9DD";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  tape(ctx, cx + Math.sin(angle) * h * 0.5, cy - Math.cos(angle) * h * 0.5, size * 0.42, size * 0.11, angle + (rnd() - 0.5) * 0.25);
}

/** a word with a stroke of highlighter behind it; returns its width */
function highlighted(ctx: Ctx, text: string, x: number, y: number, size: number, rnd: () => number) {
  ctx.font = `italic 500 ${size}px ${FONT.serif}`;
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.translate(x, y - size * 0.28);
  ctx.rotate((rnd() - 0.5) * 0.04);
  ctx.fillStyle = HIGHLIGHT;
  ctx.beginPath();
  ctx.moveTo(-8, -size * 0.18);
  ctx.lineTo(w + 10, -size * 0.24);
  ctx.lineTo(w + 6, size * 0.3);
  ctx.lineTo(-6, size * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.fillText(text, x, y);
  return w;
}

function fit(ctx: Ctx, text: string, font: (px: number) => string, px: number, max: number) {
  ctx.font = font(px);
  while (ctx.measureText(text).width > max && px > 20) { px -= 4; ctx.font = font(px); }
  return px;
}

function margin(ctx: Ctx, recap: Recap, top: number, bottom: number) {
  const doodles = doodlesFor(recap.days.map((d) => d.text).join(" "), 9);
  const step = Math.min(110, (bottom - top) / Math.max(1, doodles.length));
  doodles.forEach((d, i) => {
    ctx.save();
    ctx.translate(59, top + i * step + 34);
    ctx.rotate((tiltFor(d.id, i) * Math.PI) / 180);
    const s = 64 / 48;
    ctx.translate(-32, -32);
    ctx.scale(s, s);
    ctx.strokeStyle = PEN;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const p of d.paths) ctx.stroke(new Path2D(p));
    ctx.restore();
  });
}

function header(ctx: Ctx, kind: Recap["kind"], rnd: () => number) {
  // the mark: a small yellow Mote, and the wordmark
  mote(ctx, 174, 92, 24, "#FFD84D", "bright", rnd);
  ctx.fillStyle = INK;
  ctx.font = `italic 520 44px ${FONT.serif}`;
  ctx.fillText("felt", 210, 106);
  ctx.fillStyle = PEN;
  ctx.font = `600 46px ${FONT.hand}`;
  ctx.textAlign = "right";
  ctx.fillText(kind === "week" ? "my week, on paper" : "my month, on paper", RIGHT, 104);
  ctx.textAlign = "left";
}

function footer(ctx: Ctx, recap: Recap, y: number) {
  ctx.fillStyle = "rgba(27,31,59,0.62)";
  ctx.font = `500 26px ${FONT.sans}`;
  const pages = `${recap.days.length} page${recap.days.length === 1 ? "" : "s"} · ${recap.photos} photo${recap.photos === 1 ? "" : "s"}`;
  ctx.fillText(recap.kind === "month" && recap.streak > 2 ? `${pages} · ${recap.streak} days in a row` : pages, LEFT, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(27,31,59,0.45)";
  ctx.fillText("made in felt", RIGHT, y);
  ctx.textAlign = "left";
}

function songStrip(ctx: Ctx, song: NonNullable<Recap["song"]>, x: number, y: number, w: number, label: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.012);
  ctx.fillStyle = TAPE;
  ctx.fillRect(0, 0, w, 96);
  const bars = song.envelope.filter((_, i) => i % 2 === 0).slice(0, 36);
  bars.forEach((v, i) => {
    const bh = Math.max(6, v * 56);
    ctx.fillStyle = PEN;
    ctx.beginPath();
    ctx.roundRect(26 + i * 9, 48 - bh / 2, 5, bh, 2.5);
    ctx.fill();
  });
  const tx = 26 + bars.length * 9 + 22;
  ctx.fillStyle = "#4A3C08";
  ctx.font = `600 32px ${FONT.hand}`;
  ctx.fillText(label, tx, 38);
  ctx.fillStyle = INK;
  ctx.font = `500 26px ${FONT.sans}`;
  let name = song.name;
  while (ctx.measureText(`${name} · ${song.bpm} bpm`).width > w - tx - 20 && name.length > 4) name = name.slice(0, -2);
  ctx.fillText(`${name === song.name ? name : `${name.trim()}…`} · ${song.bpm} bpm`, tx, 74);
  ctx.restore();
}

/** highlighted words on one line — as many as fit */
function wordsRow(ctx: Ctx, words: string[], x: number, y: number, max: number, size: number, rnd: () => number) {
  let wx = x;
  for (const w of words) {
    ctx.font = `italic 500 ${size}px ${FONT.serif}`;
    const ww = ctx.measureText(w).width;
    if (wx + ww > x + max) break;
    highlighted(ctx, w, wx, y, size, rnd);
    wx += ww + 34;
  }
}

async function photos(recap: Recap, n: number) {
  return Promise.all(recap.covers.slice(0, n).map(loadImage));
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

async function drawWeek(ctx: Ctx, recap: Recap) {
  const rnd = mulberry32(recap.start.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const top = MOOD[recap.topMood];
  header(ctx, "week", rnd);

  // title, and Mote in the colour of the week
  mote(ctx, 912, 236, 74, top.color, recap.topMood, rnd);
  const px = fit(ctx, recap.label, (p) => `500 ${p}px ${FONT.serif}`, 92, 660);
  ctx.fillStyle = INK;
  ctx.fillText(recap.label, LEFT, 250);
  ctx.fillStyle = PEN;
  ctx.font = `600 40px ${FONT.hand}`;
  ctx.fillText(`${recap.sub} · mostly ${top.label.toLowerCase()}`, LEFT, 250 + Math.max(56, px * 0.62));

  // the seven days
  const col = CONTENT / 7;
  const byDay = new Map(recap.days.map((d) => [d.day, d]));
  for (let i = 0; i < 7; i++) {
    const date = new Date(`${recap.start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const cx = LEFT + col * i + col / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(27,31,59,0.55)";
    ctx.font = `600 34px ${FONT.hand}`;
    ctx.fillText(DAY_LETTERS[i], cx, 380);
    const d = byDay.get(key);
    if (d) mote(ctx, cx, 436, 36, MOOD[d.mood].color, d.mood, rnd);
    else {
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(27,31,59,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, 436, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "rgba(27,31,59,0.6)";
    ctx.font = `500 24px ${FONT.sans}`;
    ctx.fillText(String(date.getUTCDate()), cx, 506);
    ctx.textAlign = "left";
  }

  // three photos, taped in
  const imgs = await photos(recap, 3);
  const spots = imgs.length === 1 ? [[580, 0]] : imgs.length === 2 ? [[420, -0.05], [740, 0.04]] : [[300, -0.07], [580, 0.05], [850, -0.03]];
  imgs.forEach((img, i) => polaroid(ctx, img, spots[i][0], 740 + (i % 2) * 18, imgs.length === 1 ? 330 : 256, spots[i][1], rnd));

  // words of the week
  ctx.fillStyle = PEN;
  ctx.font = `600 36px ${FONT.hand}`;
  ctx.fillText("the week in words", LEFT, 1000);
  wordsRow(ctx, recap.words.slice(0, 5), LEFT + 6, 1066, CONTENT - 20, 48, rnd);

  if (recap.song) songStrip(ctx, recap.song, LEFT - 10, 1128, 760, recap.song.count > 1 ? `on repeat ×${recap.song.count}` : "the song");
  footer(ctx, recap, 1292);
  margin(ctx, recap, 300, 1240);
}

async function drawMonth(ctx: Ctx, recap: Recap) {
  const rnd = mulberry32(recap.start.split("").reduce((a, c) => a * 37 + c.charCodeAt(0), 11) >>> 0);
  const top = MOOD[recap.topMood];
  header(ctx, "month", rnd);

  mote(ctx, 906, 236, 80, top.color, recap.topMood, rnd);
  fit(ctx, recap.label, (p) => `500 ${p}px ${FONT.serif}`, 140, 640);
  ctx.fillStyle = INK;
  ctx.fillText(recap.label, LEFT, 270);
  ctx.fillStyle = PEN;
  ctx.font = `600 42px ${FONT.hand}`;
  ctx.fillText(`${recap.sub} · mostly ${top.label.toLowerCase()}`, LEFT, 330);

  // the calendar: every written day is a dab of its mood
  const first = new Date(`${recap.start}T12:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const daysIn = Number(recap.end.slice(8, 10));
  const col = CONTENT / 7, row = 66, gy = 400;
  ctx.textAlign = "center";
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = "rgba(27,31,59,0.5)";
    ctx.font = `600 30px ${FONT.hand}`;
    ctx.fillText(DAY_LETTERS[i], LEFT + col * i + col / 2, gy);
  }
  const byDay = new Map(recap.days.map((d) => [Number(d.day.slice(8, 10)), d]));
  for (let dn = 1; dn <= daysIn; dn++) {
    const idx = lead + dn - 1;
    const cx = LEFT + col * (idx % 7) + col / 2, cy = gy + 44 + Math.floor(idx / 7) * row;
    const d = byDay.get(dn);
    if (d) {
      const c = MOOD[d.mood].color;
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(cx + (rnd() - 0.5) * 4, cy + (rnd() - 0.5) * 4, 27 + rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = INK;
      ctx.font = `600 24px ${FONT.sans}`;
    } else {
      ctx.fillStyle = "rgba(27,31,59,0.35)";
      ctx.font = `500 22px ${FONT.sans}`;
    }
    ctx.fillText(String(dn), cx, cy + 8);
  }
  ctx.textAlign = "left";
  const lastRow = Math.floor((lead + daysIn - 1) / 7);
  const calBottom = gy + 44 + lastRow * row + 28;

  // four photos of the brightest days
  const imgs = await photos(recap, 4);
  const size = 168, frameH = size * 1.21;
  const py = calBottom + 22 + frameH / 2;
  imgs.forEach((img, i) => polaroid(ctx, img, LEFT + 110 + i * 214, py, size, [-0.06, 0.04, -0.02, 0.06][i], rnd));
  let y = Math.max(1000, py + frameH / 2 + 34);

  // how the month felt, as one bar
  const total = recap.moods.reduce((n, m) => n + m.count, 0) || 1;
  let x = LEFT;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(LEFT, y, CONTENT, 20, 10);
  ctx.clip();
  for (const m of recap.moods) {
    const w = (CONTENT * m.count) / total;
    ctx.fillStyle = MOOD[m.mood].color;
    ctx.fillRect(x, y, w + 1, 20);
    x += w;
  }
  ctx.restore();
  ctx.fillStyle = "rgba(27,31,59,0.7)";
  ctx.font = `500 24px ${FONT.sans}`;
  ctx.fillText(recap.moods.slice(0, 5).map((m) => `${MOOD[m.mood].label.toLowerCase()} ${m.count}`).join("  ·  "), LEFT, y + 52);

  y += 130;
  wordsRow(ctx, recap.words.slice(0, 5), LEFT + 6, y, CONTENT - 20, 42, rnd);
  if (recap.song) {
    ctx.fillStyle = PEN;
    ctx.font = `600 36px ${FONT.hand}`;
    ctx.fillText(`on repeat: ${recap.song.name}${recap.song.count > 1 ? ` ×${recap.song.count}` : ""}`, LEFT, y + 70);
  }
  footer(ctx, recap, 1292);
  margin(ctx, recap, 300, 1240);
}

/** Draws the recap onto a canvas (for the preview) at the size Instagram wants. */
export async function drawRecap(canvas: HTMLCanvasElement, recap: Recap, format: CardFormat) {
  await fontsReady();
  const H = format === "story" ? 1920 : POST_H;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  paper(ctx, H);
  ctx.save();
  if (format === "story") ctx.translate(0, (H - POST_H) / 2);
  if (recap.kind === "week") await drawWeek(ctx, recap);
  else await drawMonth(ctx, recap);
  ctx.restore();
}

export async function shareRecap(recap: Recap, format: CardFormat) {
  const canvas = document.createElement("canvas");
  await drawRecap(canvas, recap, format);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the card"))), "image/png"));
  const name = `felt-${recap.kind}-${recap.key}${format === "story" ? "-story" : ""}.png`;
  return shareImage(blob, name, `${recap.label} in Felt`);
}
