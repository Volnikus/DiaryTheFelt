// Theme presets that blend into each other.
// Each preset has an "affinity" — how strongly it matches a mood vector.
// The two (or three) strongest presets are mixed by weight into one palette.
import type { TextAnalysis } from "../types.ts";
import type { MoodCount } from "../analysis/mood.ts";

export interface ThemePreset {
  id: string;
  name: string;
  ground: string;
  surface: string;
  ink: string;
  accent: string;
  glow: string;
  /** what the preset responds to (each −1 … 1) */
  affinity: Partial<Record<"balance" | "charge" | "warmth" | "nostalgia" | "tension" | "together" | "night" | "rain", number>>;
}

export const PRESETS: ThemePreset[] = [
  { id: "sunlit", name: "Sunlit", ground: "#FFF8E1", surface: "#FFFFFF", ink: "#11110F", accent: "#FFD83D", glow: "#FFE98A", affinity: { balance: 1, charge: 0.4, warmth: 0.6 } },
  { id: "bloom", name: "Bloom", ground: "#FCEEF0", surface: "#FFFFFF", ink: "#2A1418", accent: "#FF8FA3", glow: "#FFC2CD", affinity: { balance: 0.7, together: 1, warmth: 0.5 } },
  { id: "meadow", name: "Meadow", ground: "#EEF4E6", surface: "#FBFDF7", ink: "#16200F", accent: "#8CCB5E", glow: "#C7E8A8", affinity: { balance: 0.5, charge: -0.6, tension: -0.6 } },
  { id: "ember", name: "Ember", ground: "#2A1610", surface: "#3A2017", ink: "#FFF2E8", accent: "#FF7A3D", glow: "#FFB37A", affinity: { charge: 1, warmth: 0.8, tension: 0.3 } },
  { id: "sepia", name: "Sepia", ground: "#F2E8D8", surface: "#FBF5EA", ink: "#2B2118", accent: "#C99A5B", glow: "#E8CFA4", affinity: { nostalgia: 1, charge: -0.3 } },
  { id: "tide", name: "Tide", ground: "#E6F0F3", surface: "#F7FBFC", ink: "#0F1D22", accent: "#4BA3C3", glow: "#A9D8E8", affinity: { balance: 0.2, charge: -0.8, rain: 0.4 } },
  { id: "rain", name: "Rain", ground: "#1C2228", surface: "#262E35", ink: "#E8EEF2", accent: "#7FA7C9", glow: "#AFC8DD", affinity: { balance: -0.6, rain: 1, nostalgia: 0.3 } },
  { id: "storm", name: "Storm", ground: "#11110F", surface: "#1C1C1A", ink: "#FFFFFF", accent: "#B48CFF", glow: "#D3BEFF", affinity: { balance: -1, charge: 0.9, tension: 0.8 } },
  { id: "midnight", name: "Midnight", ground: "#0D1020", surface: "#171B31", ink: "#EEF0FF", accent: "#FFD83D", glow: "#6E78D6", affinity: { night: 1, charge: -0.2 } },
];

export interface ThemeBlend {
  parts: { preset: ThemePreset; weight: number }[];
  palette: { ground: string; surface: string; ink: string; accent: string; glow: string; dark: boolean };
  name: string;
}

function features(mood: MoodCount, a: TextAnalysis | null) {
  return {
    balance: mood.balance,
    charge: mood.charge * 2 - 1,
    warmth: a ? a.warmth * 2 - 1 : 0,
    nostalgia: a ? a.nostalgia * 2 - 1 : -1,
    tension: a ? a.tension * 2 - 1 : -1,
    together: a ? a.togetherness * 2 - 1 : 0,
    night: a && ["night", "late-night", "evening"].includes(a.timeOfDay) ? 1 : -0.5,
    rain: a && a.weather.some((w) => /rain|storm|snow|fog/.test(w)) ? 1 : -0.5,
  };
}

export function blendThemes(mood: MoodCount, analysis: TextAnalysis | null): ThemeBlend {
  const f = features(mood, analysis);
  const scored = PRESETS.map((p) => {
    const keys = Object.keys(p.affinity) as (keyof typeof f)[];
    const dot = keys.reduce((acc, k) => acc + (p.affinity[k] ?? 0) * f[k], 0) / Math.max(1, keys.length);
    return { preset: p, score: dot };
  }).sort((x, y) => y.score - x.score);

  // softmax over the top three so the blend is smooth, not a hard switch
  const top = scored.slice(0, 3);
  const exps = top.map((t) => Math.exp(t.score * 4));
  const total = exps.reduce((a, b) => a + b, 0);
  const parts = top.map((t, i) => ({ preset: t.preset, weight: exps[i] / total })).filter((p) => p.weight > 0.12);
  const norm = parts.reduce((a, p) => a + p.weight, 0);
  parts.forEach((p) => (p.weight /= norm));

  const mixKey = (k: "ground" | "surface" | "ink" | "accent" | "glow") => mix(parts.map((p) => [p.preset[k], p.weight]));
  const ground = mixKey("ground");
  const dark = luminance(ground) < 0.35;
  // keep text readable: ink comes from the dominant preset family (light or dark)
  const ink = dark ? "#FFFFFF" : "#11110F";
  return {
    parts,
    palette: { ground, surface: mixKey("surface"), ink, accent: mixKey("accent"), glow: mixKey("glow"), dark },
    name: parts.map((p) => p.preset.name).join(" × "),
  };
}

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(list: [string, number][]): string {
  const acc = [0, 0, 0];
  for (const [hex, w] of list) hexToRgb(hex).forEach((c, i) => (acc[i] += c * w));
  return `#${acc.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
