"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo } from "react";
import { doodlesFor, tiltFor, type Doodle } from "@/lib/doodles";
import { sfx } from "@/lib/client/sound";
import s from "./MarginDoodles.module.css";

/**
 * The notebook margin. When the words mention something drawable — rain, coffee, the sea,
 * a cat — a small ballpoint doodle draws itself here, stroke by stroke.
 */
export function MarginDoodles({ text, max = 6, quiet = false, className, size = 36 }: { text: string; max?: number; quiet?: boolean; className?: string; size?: number }) {
  const ids = doodlesFor(text, max).map((d) => d.id).join(",");
  // only re-derive when the set of doodles changes, not on every key press
  const doodles = useMemo(() => doodlesFor(text, max), [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`${s.margin} ${className ?? ""}`} aria-hidden>
      <AnimatePresence initial={false}>
        {doodles.map((d, i) => <Drawn key={d.id} d={d} i={i} quiet={quiet} size={size} />)}
      </AnimatePresence>
    </div>
  );
}

function Drawn({ d, i, quiet, size }: { d: Doodle; i: number; quiet: boolean; size: number }) {
  const reduce = useReducedMotion();
  useEffect(() => { if (!quiet) sfx.scribble(d.paths.length); }, [quiet, d]);
  const per = Math.min(0.32, 1.1 / d.paths.length);
  return (
    <motion.svg
      layout
      className={s.doodle}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ rotate: tiltFor(d.id, i) }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.25 } }}
      transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
    >
      <title>{d.id}</title>
      {d.paths.map((p, k) => (
        <motion.path
          key={k}
          d={p}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: per * 1.6, delay: k * per, ease: [0.45, 0, 0.25, 1] }, opacity: { duration: 0.01, delay: k * per } }}
        />
      ))}
    </motion.svg>
  );
}

/** Static doodles for a finished page (memory view): drawn once when they scroll into view. */
export function DoodleRow({ text, max = 8, className }: { text: string; max?: number; className?: string }) {
  const doodles = useMemo(() => doodlesFor(text, max), [text, max]);
  const reduce = useReducedMotion();
  if (!doodles.length) return null;
  return (
    <div className={`${s.row} ${className ?? ""}`} aria-hidden>
      {doodles.map((d, i) => {
        const per = Math.min(0.3, 1 / d.paths.length);
        return (
          <svg key={d.id} className={s.doodle} viewBox="0 0 48 48" width={44} height={44} style={{ rotate: `${tiltFor(d.id, i)}deg` }}>
            {d.paths.map((p, k) => (
              <motion.path
                key={k}
                d={p}
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ pathLength: { duration: per * 1.6, delay: i * 0.35 + k * per, ease: [0.45, 0, 0.25, 1] }, opacity: { duration: 0.01, delay: i * 0.35 + k * per } }}
              />
            ))}
          </svg>
        );
      })}
    </div>
  );
}
