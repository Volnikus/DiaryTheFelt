"use client";

import type { Entry } from "../types";
import { MOOD } from "../moods";
import { countMood } from "../analysis/mood";

const W = 1080;

/** Self-hosted font stacks, read from the page's CSS variables so the canvas uses the same faces. */
export function F() {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  return { sans: v("--font-sans", "system-ui, sans-serif"), serif: v("--font-serif", "Georgia, serif"), mono: v("--font-mono", "monospace"), expressive: v("--font-expressive", "system-ui, sans-serif") };
}
export type CardFormat = "post" | "story";
/** post = 4:5 feed image · story = 9:16 with Instagram's top/bottom UI zones kept clear */
const LAYOUT = {
  post: { H: 1350, top: 72, photoH: 720, bottom: 72, titleLines: 2 },
  story: { H: 1920, top: 230, photoH: 860, bottom: 250, titleLines: 3 },
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…");
  return lines;
}

/** Draws a shareable 4:5 postcard of one memory and returns it as a PNG blob. */
export async function makePostcard(entry: Entry, format: CardFormat = "post"): Promise<Blob> {
  const L = LAYOUT[format], H = L.H;
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = entry.design.palette;
  const mood = MOOD[countMood(entry.text).mood];

  // flat paper ground
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, 0, W, H);

  // photographs: one big, up to two small
  const imgs = (await Promise.all(entry.photos.slice(0, 3).map((ph) => loadImage(ph.media.url)))).filter((x): x is HTMLImageElement => Boolean(x));
  const pad = 72;
  const photoH = L.photoH;
  const top = L.top;
  ctx.save();
  if (imgs.length >= 2) {
    const big = (W - pad * 2) * 0.64;
    cover(ctx, imgs[0], pad, top, big - 8, photoH);
    const smallW = W - pad * 2 - big;
    const smallH = imgs[2] ? photoH / 2 - 8 : photoH;
    cover(ctx, imgs[1], pad + big + 8, top, smallW - 8, smallH);
    if (imgs[2]) cover(ctx, imgs[2], pad + big + 8, top + photoH / 2 + 8, smallW - 8, photoH / 2 - 8);
  } else if (imgs[0]) {
    cover(ctx, imgs[0], pad, top, W - pad * 2, photoH);
  } else {
    ctx.fillStyle = p.surface;
    ctx.fillRect(pad, top, W - pad * 2, photoH);
  }
  ctx.restore();

  // palette strip
  const sw = p.swatches.slice(0, 6);
  sw.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(pad + i * ((W - pad * 2) / sw.length), top + photoH + 24, (W - pad * 2) / sw.length, 14);
  });

  // date + mood
  let y = top + photoH + 92;
  ctx.fillStyle = p.muted;
  ctx.font = `500 26px ${F().mono}`;
  const date = new Date(`${entry.day}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
  ctx.fillText(date, pad, y);
  ctx.fillStyle = mood.color;
  const mw = ctx.measureText(mood.label.toUpperCase()).width;
  ctx.beginPath();
  ctx.arc(W - pad - mw - 22, y - 9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(mood.label.toUpperCase(), W - pad - mw, y);

  // title
  y += 34;
  ctx.fillStyle = p.ink;
  ctx.font = `300 84px ${F().serif}`;
  for (const line of wrap(ctx, entry.title, W - pad * 2, L.titleLines)) {
    y += 86;
    ctx.fillText(line, pad, y);
  }

  // atmosphere line
  ctx.fillStyle = p.muted;
  ctx.font = `italic 300 34px ${F().serif}`;
  for (const line of wrap(ctx, entry.analysis.atmosphereLine, W - pad * 2, 2)) {
    y += 46;
    ctx.fillText(line, pad, y);
  }

  // song + mark
  const song = entry.music.kind === "file" ? entry.music.name : [entry.music.title, entry.music.artist].filter(Boolean).join(" — ");
  ctx.font = `500 28px ${F().sans}`;
  ctx.fillStyle = p.accent;
  if (song) ctx.fillText(`♪  ${song}`.slice(0, 60), pad, H - L.bottom);
  ctx.fillStyle = p.muted;
  ctx.font = `600 30px ${F().expressive}`;
  const mark = "felt";
  ctx.fillText(mark, W - pad - ctx.measureText(mark).width, H - L.bottom);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the postcard"))), "image/png"));
}

const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40);
export const isMobile = () => typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/** Opens the phone's share sheet (Instagram → Story is one tap from there); downloads on desktop. */
export async function shareImage(blob: Blob, name: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: "image/png" });
  if (isMobile() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

export async function sharePostcard(entry: Entry, format: CardFormat = "post") {
  const blob = await makePostcard(entry, format);
  return shareImage(blob, `felt-${entry.day}-${slug(entry.title)}${format === "story" ? "-story" : ""}.png`, entry.title);
}
