"use client";

import { AnimatePresence, motion } from "motion/react";
import type { MoodCount } from "@/lib/analysis/mood";
import type { ThemeBlend } from "@/lib/engine/presets";
import { MoodDoodle } from "./MoodDoodle";
import s from "./MoodMeter.module.css";

const LABEL: Record<MoodCount["mood"], string> = {
  radiant: "radiant", bright: "bright", calm: "calm", mixed: "mixed", low: "low", stormy: "stormy", blank: "listening",
};

/** Mote counts the good and the hard words as you write; the theme eases in behind. */
export function MoodMeter({ mood, blend, themed }: { mood: MoodCount; blend: ThemeBlend; themed: boolean }) {
  const recent = mood.hits.slice(-6);
  

  return (
    <div className={s.meter} aria-live="polite">
      <div className={s.head}>
        <MoodDoodle mood={mood} color={themed ? blend.palette.accent : "#9DBBF5"} size={96} follow />
        <div className={s.read}>
          <span className={s.kicker}>today feels</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong
              key={mood.mood}
              className={s.word}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {LABEL[mood.mood]}
            </motion.strong>
          </AnimatePresence>
          <div className={s.balance} aria-label={`balance ${Math.round(mood.balance * 100)}`}>
            <div className={s.track}>
              <motion.i animate={{ left: `${50 + mood.balance * 50}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className={s.ends}><span>hard</span><span>good</span></div>
          </div>
        </div>
      </div>

      <dl className={s.stats}>
        <div>
          <dt>good words</dt>
          <dd><Num value={mood.positive} sign="+" /></dd>
        </div>
        <div>
          <dt>hard words</dt>
          <dd><Num value={mood.negative} sign="−" /></dd>
        </div>
      </dl>

      {recent.length > 0 && (
        <ul className={s.words}>
          <AnimatePresence initial={false}>
            {recent.map((h) => (
              <motion.li
                key={`${h.index}-${h.phrase}`}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3 }}
                data-sign={h.score > 0 ? "pos" : "neg"}
              >
                {h.phrase}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className={s.theme}>
        <span className={s.kicker}>theme</span>
        <div className={s.swatches}>
          {themed ? (
            blend.parts.map((p) => (
              <span key={p.preset.id} className={s.swatch}>
                <i style={{ background: p.preset.accent }} />
                {p.preset.name.toLowerCase()} <b>{Math.round(p.weight * 100)}%</b>
              </span>
            ))
          ) : (
            <span className={s.waiting}>appears as you write</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Num({ value, sign }: { value: number; sign: string }) {
  return (
    <span className={s.num}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ duration: 0.3 }}>
          {value ? sign : ""}{value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
