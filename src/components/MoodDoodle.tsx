"use client";

import { motion, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { MoodCount } from "@/lib/analysis/mood";
import { BROW, MOUTH } from "@/lib/mote-face";
import { sfx } from "@/lib/client/sound";

/**
 * Mote, drawn in the notebook: a watercolour blot in the colour of the day
 * with a face in ballpoint ink. It blinks now and then (it is listening),
 * and the expression and tilt follow the words. With `follow`, its eyes follow the
 * pointer, and a tap tickles it.
 */
export function MoodDoodle({ mood, color, size = 120, follow = false }: { mood: MoodCount; color: string; size?: number; follow?: boolean }) {
  const ink = "#1B1F3B";
  const eyeOpen = mood.mood === "radiant" ? 0.55 : 1;
  const ease = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
  const ref = useRef<SVGSVGElement>(null);
  const lookX = useSpring(0, { stiffness: 140, damping: 18 });
  const lookY = useSpring(0, { stiffness: 140, damping: 18 });
  const [tickles, setTickles] = useState(0);
  const [giggle, setGiggle] = useState(false);
  const giggleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!follow) return;
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
      lookX.set((dx / d) * 4.5 * k);
      lookY.set((dy / d) * 3.5 * k);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [follow, lookX, lookY]);
  useEffect(() => () => clearTimeout(giggleTimer.current), []);

  const tickle = () => {
    if (!follow) return;
    setTickles((n) => n + 1);
    setGiggle(true);
    sfx.plop();
    clearTimeout(giggleTimer.current);
    giggleTimer.current = setTimeout(() => setGiggle(false), 1100);
  };

  return (
    <motion.svg
      ref={ref}
      onPointerDown={tickle}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Mote feels ${mood.mood === "blank" ? "like listening" : mood.mood}`}
      style={{ overflow: "visible", flex: "none", cursor: follow ? "pointer" : undefined, touchAction: "manipulation" }}
      animate={{ rotate: mood.balance * 6 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.g
        animate={{ rotate: tickles ? (tickles % 2 ? [0, -9, 8, -6, 4, 0] : [0, 9, -8, 6, -4, 0]) : 0, scale: tickles ? (tickles % 2 ? [1, 1.08, 0.96, 1] : [1, 1.07, 0.97, 1]) : 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ originX: "60px", originY: "62px" }}
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

      {/* eyes — blink in place, look at the pointer; squeezed shut while giggling */}
      <motion.g style={{ x: lookX, y: lookY }}>
        {giggle ? (
          <g fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round">
            <path d="M39 60 Q 45 52 51 60" />
            <path d="M69 60 Q 75 52 81 60" />
          </g>
        ) : (
          <motion.g
            animate={{ scaleY: [eyeOpen, eyeOpen, 0.08, eyeOpen] }}
            transition={{ duration: 4.8, repeat: Infinity, times: [0, 0.93, 0.96, 1], ease: "easeInOut" }}
            style={{ originX: 0.5, originY: 0.5, transformBox: "fill-box" }}
          >
            <ellipse cx="45" cy="58" rx="3.6" ry="5.4" fill={ink} />
            <ellipse cx="75" cy="58" rx="3.6" ry="5.4" fill={ink} />
          </motion.g>
        )}
      </motion.g>

      {/* cheeks: a dab of pink when the day is good (and while giggling) */}
      <motion.g animate={{ opacity: mood.balance > 0.25 || giggle ? 0.8 : 0 }} transition={{ duration: 1.2 }} filter="url(#felt-watercolor)">
        <circle cx="34" cy="72" r="7" fill="#FF8FA8" />
        <circle cx="86" cy="72" r="7" fill="#FF8FA8" />
      </motion.g>

      {/* mouth */}
      <motion.path d={MOUTH[mood.mood]} animate={{ d: giggle ? MOUTH.radiant : MOUTH[mood.mood] }} transition={ease} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  );
}
