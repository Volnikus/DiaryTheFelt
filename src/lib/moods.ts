import type { DayMood } from "./types";

export const MOODS: { key: DayMood; label: string; color: string; line: string }[] = [
  { key: "radiant", label: "Radiant", color: "#E2A72E", line: "days that glowed" },
  { key: "bright", label: "Bright", color: "#DD7A3E", line: "warm, good days" },
  { key: "calm", label: "Calm", color: "#4E937A", line: "quiet, soft days" },
  { key: "mixed", label: "Mixed", color: "#8466A8", line: "a bit of everything" },
  { key: "low", label: "Low", color: "#4A6AA5", line: "heavier days" },
  { key: "stormy", label: "Stormy", color: "#B23A3A", line: "hard, loud days" },
  { key: "blank", label: "Unspoken", color: "#A39C8F", line: "days without many feelings in words" },
];

export const MOOD = Object.fromEntries(MOODS.map((m) => [m.key, m])) as Record<DayMood, (typeof MOODS)[number]>;
