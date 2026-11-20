"use client";

import { useEffect, useRef } from "react";
import type { MemoryDesign } from "@/lib/types";
import { mulberry32 } from "@/lib/engine/random";

interface Props {
  design: MemoryDesign;
  level?: () => number | null;
  className?: string;
  intensity?: number;
}

export function GenerativeField({ design, level, className, intensity = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(design.seed);
    const { field, palette, motion, composition } = design;
    const colors = [palette.accent, palette.accent2, palette.glow, ...palette.swatches.slice(0, 3)];
    const dark = palette.dark;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = performance.now(), lastBeat = -1;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; c: string; rot: number; vr: number; life: number };
    let parts: P[] = [];
    const rings: { r: number; a: number }[] = [];
    const sprites = new Map<string, HTMLCanvasElement>();

    const sprite = (c: string) => {
      let s = sprites.get(c);
      if (!s) {
        s = document.createElement("canvas");
        s.width = s.height = 128;
        const g = s.getContext("2d")!;
        const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, c);
        grad.addColorStop(0.55, `${c}88`);
        grad.addColorStop(1, `${c}00`);
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        sprites.set(c, s);
      }
      return s;
    };

    const count = () => {
      const base = { drift: 70, bokeh: 22, grid: 0, pulse: 18, rays: 26, rain: 110 }[field.kind];
      return Math.round(base * (0.5 + field.density) * Math.min(1.4, (w * h) / (1280 * 800) + 0.4) * intensity);
    };

    const spawn = (initial: boolean): P => {
      const c = colors[Math.floor(rand() * colors.length)];
      switch (field.kind) {
        case "drift":
          return { x: rand() * w, y: initial ? rand() * h : -20, vx: (rand() - 0.5) * 12, vy: 10 + rand() * 22 * field.speed, r: 3 + rand() * 7 * field.weight, a: 0.35 + rand() * 0.5, c, rot: rand() * 6.28, vr: (rand() - 0.5) * 1.2, life: 0 };
        case "bokeh":
          return { x: rand() * w, y: rand() * h, vx: (rand() - 0.5) * 6, vy: -2 - rand() * 6, r: 30 + rand() * 90, a: 0.12 + rand() * 0.3, c, rot: rand() * 6.28, vr: 0.2 + rand() * 0.6, life: 0 };
        case "rain":
          return { x: rand() * w * 1.2, y: initial ? rand() * h : -40, vx: -40 - field.speed * 30, vy: 420 + rand() * 300 * field.speed, r: 12 + rand() * 26, a: 0.15 + rand() * 0.35, c, rot: 0, vr: 0, life: 0 };
        default:
          return { x: rand() * w, y: rand() * h, vx: (rand() - 0.5) * 8, vy: -4 - rand() * 10, r: 1 + rand() * 2.5, a: 0.3 + rand() * 0.5, c, rot: 0, vr: 0, life: 0 };
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: count() }, () => spawn(true));
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const beatPos = now / motion.beatMs;
      const beat = Math.floor(beatPos);
      const phase = beatPos - beat;
      const live = levelRef.current?.() ?? null;
      const pulse = live ?? Math.exp(-phase * (3 + motion.energy * 4)) * (0.35 + motion.energy * 0.65);
      const fx = composition.focusX * w, fy = Math.min(composition.focusY, 0.6) * h;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      if (field.kind === "grid") {
        const step = 44 + (1 - field.density) * 30;
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.08 + pulse * 0.08;
        ctx.beginPath();
        for (let x = (now * 0.01 * field.speed) % step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        const scan = ((beatPos / 4) % 1) * h;
        ctx.globalAlpha = 0.18 + pulse * 0.3;
        ctx.fillStyle = palette.accent;
        ctx.fillRect(0, scan, w, 2 + pulse * 3);
        const cellRand = mulberry32(design.seed + beat);
        for (let i = 0; i < 6 + field.density * 10; i++) {
          const cx = Math.floor(cellRand() * (w / step)) * step, cy = Math.floor(cellRand() * (h / step)) * step;
          ctx.globalAlpha = (0.05 + 0.25 * cellRand()) * pulse * 1.6;
          ctx.fillStyle = cellRand() > 0.7 ? palette.accent2 : palette.accent;
          ctx.fillRect(cx + 1, cy + 1, step - 2, step - 2);
        }
      }

      if (field.kind === "pulse" || field.kind === "rays") {
        if (beat !== lastBeat) {
          lastBeat = beat;
          if (field.kind === "pulse" && (beat % Math.max(1, Math.round(4 - motion.energy * 3)) === 0 || live !== null)) rings.push({ r: 0, a: 0.5 });
        }
      }

      if (field.kind === "rays") {
        const sx = fx, sy = Math.min(fy, h * 0.35);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(now * 0.00004 * field.speed);
        const n = 14;
        for (let i = 0; i < n; i++) {
          ctx.rotate((Math.PI * 2) / n);
          ctx.globalAlpha = (0.05 + 0.07 * pulse) * (i % 2 ? 0.6 : 1);
          ctx.fillStyle = palette.glow;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.max(w, h) * 1.2, -30 - field.weight * 12);
          ctx.lineTo(Math.max(w, h) * 1.2, 30 + field.weight * 12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        const sun = sprite(palette.glow);
        const r = 90 + pulse * 40;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(sun, sx - r, sy - r, r * 2, r * 2);
      }

      if (field.kind === "pulse") {
        ctx.lineWidth = 1 + field.weight;
        for (let i = rings.length - 1; i >= 0; i--) {
          const ring = rings[i];
          ring.r += dt * (120 + motion.bpm * 1.6);
          ring.a -= dt * 0.22;
          if (ring.a <= 0) { rings.splice(i, 1); continue; }
          ctx.globalAlpha = ring.a;
          ctx.strokeStyle = i % 2 ? palette.accent2 : palette.accent;
          ctx.beginPath();
          ctx.arc(fx, fy, ring.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt;
        const sway = Math.sin(p.life * (0.8 + p.vr) + p.rot) * (8 + pulse * 18);
        p.x += (p.vx + (field.kind === "drift" ? sway : 0)) * dt * (field.kind === "rain" ? 1 : 1 + pulse * 0.6);
        p.y += p.vy * dt * (field.kind === "rain" ? 1 : 0.6 + pulse * 0.8);
        p.rot += p.vr * dt;
        if (p.y > h + 60 || p.y < -140 || p.x < -140 || p.x > w + 140) parts[i] = spawn(false);

        if (field.kind === "drift") {
          ctx.globalAlpha = p.a;
          ctx.fillStyle = p.c;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.45 * (0.6 + 0.4 * Math.abs(Math.sin(p.life * 2 + p.rot))), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (field.kind === "bokeh") {
          ctx.globalAlpha = p.a * (0.6 + pulse * 0.7);
          const r = p.r * (1 + pulse * 0.08);
          ctx.drawImage(sprite(p.c), p.x - r, p.y - r, r * 2, r * 2);
        } else if (field.kind === "rain") {
          ctx.globalAlpha = p.a;
          ctx.strokeStyle = p.c;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.04, p.y + p.r);
          ctx.stroke();
        } else {
          ctx.globalAlpha = p.a * (0.5 + pulse);
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 + pulse), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      if (reduce) draw(last);
      else raf = requestAnimationFrame(loop);
    };

    resize();
    start();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(performance.now()); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden && visible) start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [design, intensity]);

  return <canvas ref={ref} className={className} aria-hidden style={{ width: "100%", height: "100%" }} />;
}
