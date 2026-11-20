"use client";

import { motion } from "motion/react";
import { useId } from "react";
import type { MoodCount } from "@/lib/analysis/mood";

// Every mouth uses the same cubic structure so motion can morph between them.
const MOUTH: Record<MoodCount["mood"], string> = {
  radiant: "M47 76 C53 87 67 87 73 76",
  bright: "M49 77 C54 83 66 83 71 77",
  calm: "M50 79 C55 81 65 81 70 79",
  mixed: "M49 79 C55 75 61 83 71 78",
  low: "M50 81 C55 77 65 77 70 81",
  stormy: "M48 83 C54 75 66 75 72 83",
  blank: "M52 79 C57 79 63 79 68 79",
};
const EYE_H: Record<MoodCount["mood"], number> = { radiant: 7, bright: 10, calm: 9, mixed: 10, low: 9, stormy: 11, blank: 10 };

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Mote — a soft, lit sphere that takes the colour of the day and changes
 * expression with the words. Colours ease over a few seconds (CSS), the face
 * springs (motion).
 */
export function MoodOrb({ mood, color, size = 104 }: { mood: MoodCount; color: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const tilt = mood.balance * 7;
  const pace = 4.5 - mood.charge * 2;
  const eyeH = EYE_H[mood.mood];
  const ease = { transition: "stop-color 2.8s ease, fill 2.8s ease, flood-color 2.8s ease" };
  const ink = "#1B1C2E";

  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Mote feels ${mood.mood === "blank" ? "like listening" : mood.mood}`}
      style={{ overflow: "visible", flex: "none" }}
      animate={{ rotate: [tilt - 2, tilt + 2, tilt - 2], scale: [1, 1.025, 1] }}
      transition={{ duration: pace, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="38%" cy="30%" r="78%">
          <stop offset="0" stopColor={shade(color, 0.78)} style={ease} />
          <stop offset="0.38" stopColor={shade(color, 0.22)} style={ease} />
          <stop offset="1" stopColor={shade(color, -0.42)} style={ease} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0.45" stopColor={color} stopOpacity="0.55" style={ease} />
          <stop offset="1" stopColor={color} stopOpacity="0" style={ease} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* halo: brighter when the day is more charged */}
      <circle cx="60" cy="62" r="58" fill={`url(#${id}-halo)`} opacity={0.35 + mood.charge * 0.5} />
      {/* contact shadow */}
      <ellipse cx="60" cy="112" rx="30" ry="4" fill="#000" opacity="0.28" filter={`url(#${id}-soft)`} />
      {/* body */}
      <circle cx="60" cy="60" r="44" fill={`url(#${id}-body)`} />
      {/* rim light and specular */}
      <circle cx="60" cy="60" r="43.5" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />
      <ellipse cx="45" cy="36" rx="13" ry="7" fill="#fff" opacity="0.55" transform="rotate(-24 45 36)" filter={`url(#${id}-soft)`} />

      {/* cheeks */}
      <motion.g animate={{ opacity: mood.balance > 0.25 ? 0.75 : 0 }} transition={{ duration: 1.2 }}>
        <ellipse cx="40" cy="72" rx="7" ry="4" fill="#FF8FA8" filter={`url(#${id}-soft)`} />
        <ellipse cx="80" cy="72" rx="7" ry="4" fill="#FF8FA8" filter={`url(#${id}-soft)`} />
      </motion.g>

      {/* eyes — blink every few seconds */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.08, 1] }}
        transition={{ duration: 4.6, repeat: Infinity, times: [0, 0.93, 0.96, 1], ease: "easeInOut" }}
        style={{ originX: 0.5, originY: 0.5, transformBox: "fill-box" }}
      >
        <motion.rect x="45" width="8" rx="4" fill={ink} animate={{ y: 58 - eyeH / 2, height: eyeH }} transition={{ type: "spring", stiffness: 180, damping: 16 }} />
        <motion.rect x="67" width="8" rx="4" fill={ink} animate={{ y: 58 - eyeH / 2, height: eyeH }} transition={{ type: "spring", stiffness: 180, damping: 16 }} />
        <circle cx="50.6" cy={56 - eyeH / 4} r="1.4" fill="#fff" opacity="0.9" />
        <circle cx="72.6" cy={56 - eyeH / 4} r="1.4" fill="#fff" opacity="0.9" />
      </motion.g>

      {/* mouth */}
      <motion.path
        d={MOUTH[mood.mood]}
        animate={{ d: MOUTH[mood.mood] }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        fill="none"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}
