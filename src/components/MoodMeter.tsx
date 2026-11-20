"use client";

import { AnimatePresence, motion } from "motion/react";
import type { MoodCount } from "@/lib/analysis/mood";
import type { ThemeBlend } from "@/lib/engine/presets";
import s from "./MoodMeter.module.css";

const FACE: Record<MoodCount["mood"], { mouth: string; brow: number; label: string }> = {
  radiant: { mouth: "M30 58 Q50 80 70 58", brow: -4, label: "radiant" },
  bright: { mouth: "M33 60 Q50 72 67 60", brow: -2, label: "bright" },
  calm: { mouth: "M35 63 Q50 67 65 63", brow: 0, label: "calm" },
  mixed: { mouth: "M34 64 Q42 58 50 64 Q58 70 66 64", brow: 2, label: "mixed" },
  low: { mouth: "M35 68 Q50 60 65 68", brow: 3, label: "low" },
  stormy: { mouth: "M33 70 Q50 56 67 70", brow: 5, label: "stormy" },
  blank: { mouth: "M38 64 L62 64", brow: 0, label: "listening" },
};

/** A small character "Mote" who counts the good and the hard words as you write. */
export function MoodMeter({ mood, blend }: { mood: MoodCount; blend: ThemeBlend }) {
  const face = FACE[mood.mood];
  const tilt = mood.balance * 8;
  const bounce = 0.6 + mood.charge * 1.4;
  const recent = mood.hits.slice(-6);

  return (
    <div className={s.meter} aria-live="polite">
      <div className={s.top}>
        <motion.svg
          viewBox="0 0 100 100"
          className={s.mote}
          animate={{ rotate: [tilt - 3, tilt + 3, tilt - 3], y: [0, -4 * bounce, 0] }}
          transition={{ duration: 3 / bounce, repeat: Infinity, ease: "easeInOut" }}
          aria-label={`Mood: ${face.label}`}
          role="img"
        >
          <motion.path
            d="M50 6 C76 6 94 26 94 52 C94 78 76 94 50 94 C24 94 6 78 6 52 C6 26 24 6 50 6 Z"
            animate={{ fill: blend.palette.accent }}
            transition={{ duration: 0.9 }}
            stroke="var(--ink)"
            strokeWidth="3"
          />
          <motion.g animate={{ y: face.brow }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
            <rect x="30" y="34" width="9" height="12" rx="2" fill="var(--ink)" />
            <rect x="61" y="34" width="9" height="12" rx="2" fill="var(--ink)" />
          </motion.g>
          <motion.path d={face.mouth} animate={{ d: face.mouth }} fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" transition={{ type: "spring", stiffness: 160, damping: 16 }} />
          {mood.balance > 0.3 && <circle cx="24" cy="60" r="5" fill="#FF8FA3" opacity="0.6" />}
          {mood.balance > 0.3 && <circle cx="76" cy="60" r="5" fill="#FF8FA3" opacity="0.6" />}
        </motion.svg>

        <div className={s.counts}>
          <Count label="good words" value={mood.positive} sign="+" />
          <Count label="hard words" value={mood.negative} sign="−" />
          <p className={s.state}>feels <b>{face.label}</b></p>
        </div>
      </div>

      <div className={s.scale} aria-hidden>
        <span>hard</span>
        <div className={s.track}>
          <motion.i animate={{ left: `${50 + mood.balance * 50}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
        </div>
        <span>good</span>
      </div>

      <ul className={s.words}>
        <AnimatePresence initial={false}>
          {recent.map((h) => (
            <motion.li
              key={`${h.index}-${h.phrase}`}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              data-sign={h.score > 0 ? "pos" : "neg"}
              title={`${h.score > 0 ? "+" : ""}${h.score}`}
            >
              {h.phrase}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className={s.blend}>
        <p className={s.label}><i /> theme · {blend.name.toLowerCase()}</p>
        <div className={s.bar}>
          {blend.parts.map((p) => (
            <motion.span key={p.preset.id} layout animate={{ flexGrow: p.weight }} style={{ background: `linear-gradient(90deg, ${p.preset.ground}, ${p.preset.accent})` }} title={`${p.preset.name} ${Math.round(p.weight * 100)}%`}>
              {Math.round(p.weight * 100)}%
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Count({ label, value, sign }: { label: string; value: number; sign: string }) {
  return (
    <p className={s.count}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b key={value} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}>
          {sign}{value}
        </motion.b>
      </AnimatePresence>
      <span>{label}</span>
    </p>
  );
}
