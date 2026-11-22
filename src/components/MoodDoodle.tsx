"use client";

import { motion } from "motion/react";
import type { MoodCount } from "@/lib/analysis/mood";

// Every mouth has the same cubic structure, so the pen line can morph between them.
const MOUTH: Record<MoodCount["mood"], string> = {
  radiant: "M44 74 C 50 88, 70 88, 76 74",
  bright: "M47 76 C 53 84, 67 84, 73 76",
  calm: "M49 79 C 55 81, 65 81, 71 78",
  mixed: "M47 79 C 54 74, 61 84, 73 77",
  low: "M48 82 C 54 76, 66 76, 72 82",
  stormy: "M46 84 C 53 74, 67 74, 74 84",
  blank: "M51 79 C 56 79, 64 79, 69 79",
};
const BROW: Record<MoodCount["mood"], [string, string]> = {
  radiant: ["M38 44 Q 45 39 52 43", "M68 43 Q 75 39 82 44"],
  bright: ["M39 45 Q 45 42 51 45", "M69 45 Q 75 42 81 45"],
  calm: ["M39 47 Q 45 46 51 47", "M69 47 Q 75 46 81 47"],
  mixed: ["M39 44 Q 45 42 51 46", "M69 47 Q 75 44 81 45"],
  low: ["M39 45 Q 45 47 51 49", "M69 49 Q 75 47 81 45"],
  stormy: ["M39 42 Q 46 46 52 50", "M68 50 Q 74 46 81 42"],
  blank: ["M40 47 Q 45 46 50 47", "M70 47 Q 75 46 80 47"],
};

/**
 * Mote, drawn in the notebook: a watercolour blot in the colour of the day
 * with a face in ballpoint ink. It blinks now and then (it is listening),
 * and the expression and tilt follow the words.
 */
export function MoodDoodle({ mood, color, size = 120 }: { mood: MoodCount; color: string; size?: number }) {
  const ink = "#1B1F3B";
  const eyeOpen = mood.mood === "radiant" ? 0.55 : 1;
  const ease = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Mote feels ${mood.mood === "blank" ? "like listening" : mood.mood}`}
      style={{ overflow: "visible", flex: "none" }}
      animate={{ rotate: mood.balance * 6 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* the paint */}
      <g filter="url(#felt-watercolor)">
        <circle cx="60" cy="62" r="44" style={{ fill: color, transition: "fill 2.8s ease" }} opacity="0.8" />
        <circle cx="52" cy="54" r="26" fill="#fff" opacity="0.35" />
      </g>
      {/* the ink outline, a little uneven */}
      <path
        d="M60 16 C 88 14, 106 36, 105 62 C 104 90, 84 106, 59 105 C 32 104, 14 86, 15 60 C 16 34, 34 17, 62 18"
        fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" filter="url(#felt-rough)"
      />

      {/* brows */}
      <motion.path d={BROW[mood.mood][0]} animate={{ d: BROW[mood.mood][0] }} transition={ease} fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <motion.path d={BROW[mood.mood][1]} animate={{ d: BROW[mood.mood][1] }} transition={ease} fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />

      {/* eyes — blink in place */}
      <motion.g
        animate={{ scaleY: [eyeOpen, eyeOpen, 0.08, eyeOpen] }}
        transition={{ duration: 4.8, repeat: Infinity, times: [0, 0.93, 0.96, 1], ease: "easeInOut" }}
        style={{ originX: 0.5, originY: 0.5, transformBox: "fill-box" }}
      >
        <ellipse cx="45" cy="58" rx="3.6" ry="5.4" fill={ink} />
        <ellipse cx="75" cy="58" rx="3.6" ry="5.4" fill={ink} />
      </motion.g>

      {/* cheeks: a dab of pink when the day is good */}
      <motion.g animate={{ opacity: mood.balance > 0.25 ? 0.8 : 0 }} transition={{ duration: 1.2 }} filter="url(#felt-watercolor)">
        <circle cx="34" cy="72" r="7" fill="#FF8FA8" />
        <circle cx="86" cy="72" r="7" fill="#FF8FA8" />
      </motion.g>

      {/* mouth */}
      <motion.path d={MOUTH[mood.mood]} animate={{ d: MOUTH[mood.mood] }} transition={ease} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
    </motion.svg>
  );
}
