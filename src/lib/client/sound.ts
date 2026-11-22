"use client";

import { useSyncExternalStore } from "react";

/*
 * Paper sounds, synthesised in the browser (no files): a ballpoint scratch while typing,
 * a page rustle when the notebook turns, a strip of tape, a soft plop when a drop of ink
 * lands in Mote, and a pen scribble when a margin doodle is drawn.
 * Off by default; the choice is kept in this browser only.
 */

const KEY = "felt:sound";
let on = false;
let loaded = false;
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { on = localStorage.getItem(KEY) === "1"; } catch { on = false; }
}

export function soundOn() { load(); return on; }

export function setSound(next: boolean) {
  load();
  on = next;
  try { localStorage.setItem(KEY, next ? "1" : "0"); } catch {}
  if (next) { audio(); sfx.tick(); }
  listeners.forEach((l) => l());
}

export function useSound(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    soundOn,
    () => false,
  );
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noise = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function ready(): AudioContext | null {
  if (!soundOn()) return null;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return null;
  return audio();
}

/** a burst of filtered noise with a simple envelope */
function hiss(c: AudioContext, opts: { at?: number; dur: number; freq: number; q?: number; gain: number; type?: BiquadFilterType; sweepTo?: number; flutter?: number }) {
  const t = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.dur);
  f.Q.value = opts.q ?? 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + Math.min(0.02, opts.dur / 4));
  if (opts.flutter) {
    // paper crackle: the level jitters while it decays
    for (let k = 1; k < opts.flutter; k++) {
      const at = t + (opts.dur * k) / opts.flutter;
      g.gain.setValueAtTime(opts.gain * (0.25 + Math.random() * 0.75) * (1 - k / opts.flutter), at);
    }
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t, Math.random() * 0.5, opts.dur + 0.05);
}

let lastScratch = 0;

export const sfx = {
  /** a ballpoint scratch, one per key press (throttled) */
  scratch() {
    const c = ready(); if (!c) return;
    const now = performance.now();
    if (now - lastScratch < 45) return;
    lastScratch = now;
    hiss(c, { dur: 0.035 + Math.random() * 0.03, freq: 2600 + Math.random() * 1800, q: 2.2, gain: 0.05 });
  },
  /** the page lifts, turns and lands */
  rustle() {
    const c = ready(); if (!c) return;
    hiss(c, { dur: 0.42, freq: 700, sweepTo: 3200, q: 0.8, gain: 0.09, flutter: 14 });
    hiss(c, { at: 0.36, dur: 0.18, freq: 1800, sweepTo: 600, q: 0.9, gain: 0.07, flutter: 5 });
  },
  /** a strip of tape pulled off the roll and pressed down */
  tape() {
    const c = ready(); if (!c) return;
    hiss(c, { dur: 0.22, freq: 1500, sweepTo: 4200, q: 1.6, gain: 0.06, type: "highpass", flutter: 18 });
    hiss(c, { at: 0.24, dur: 0.06, freq: 900, q: 1, gain: 0.05 });
  },
  /** a drop of ink lands in Mote */
  plop() {
    const c = ready(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(720 + Math.random() * 120, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.14);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.2);
  },
  /** a quick scribble: a margin doodle being drawn */
  scribble(strokes = 3) {
    const c = ready(); if (!c) return;
    for (let i = 0; i < Math.min(strokes, 6); i++) {
      hiss(c, { at: i * 0.12, dur: 0.09 + Math.random() * 0.05, freq: 2200 + Math.random() * 1400, sweepTo: 1600 + Math.random() * 2400, q: 2, gain: 0.04 });
    }
  },
  /** one leaf of a flipbook flicking past */
  flick() {
    const c = ready(); if (!c) return;
    hiss(c, { dur: 0.07, freq: 1200, sweepTo: 3600, q: 1, gain: 0.07, flutter: 4 });
  },
  /** a light click: something switched */
  tick() {
    const c = ready(); if (!c) return;
    hiss(c, { dur: 0.03, freq: 3400, q: 3, gain: 0.06 });
  },
};
