"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { countMood } from "@/lib/analysis/mood";
import { analyzeTextLocally } from "@/lib/analysis/text";
import { blendThemes } from "@/lib/engine/presets";
import { faceFor } from "@/lib/engine/typeface";
import { sfx } from "@/lib/client/sound";
import { MarginDoodles } from "./MarginDoodles";
import { MoodDoodle } from "./MoodDoodle";
import s from "./HomeWriter.module.css";

const EXAMPLES = [
  "the sunset made my day, even after a really stressful exam.",
  "a slow rainy morning, tea and nothing to hurry for.",
  "not bad at all — we laughed at the beach until it got dark.",
  "felt a bit lonely today, but my sister called in the evening.",
];

const WORD: Record<string, string> = {
  radiant: "radiant", bright: "bright", calm: "calm", mixed: "mixed", low: "a bit low", stormy: "stormy", blank: "listening",
};

/** One line on the notebook page. Mote reads it, the paint follows, the pen changes. */
export function HomeWriter() {
  const [text, setText] = useState("");
  const [demo, setDemo] = useState("");
  const [touched, setTouched] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Until the visitor writes, the page writes example days by itself.
  useEffect(() => {
    if (touched) return;
    let line = 0, i = 0, pause = 0;
    const t = setInterval(() => {
      const full = EXAMPLES[line % EXAMPLES.length];
      if (pause > 0) { pause--; return; }
      if (i <= full.length) { setDemo(full.slice(0, i)); i++; if (i > full.length) pause = 50; }
      else { line++; i = 0; setDemo(""); }
    }, 58);
    return () => clearInterval(t);
  }, [touched]);

  const live = touched ? text : demo;
  const mood = useMemo(() => countMood(live), [live]);
  const [settled, setSettled] = useState(mood);
  useEffect(() => {
    const t = setTimeout(() => setSettled(countMood(live)), 600);
    return () => clearTimeout(t);
  }, [live]);
  const analysis = useMemo(() => (live.trim().length > 20 ? analyzeTextLocally(live) : null), [live]);
  const blend = useMemo(() => blendThemes(settled, analysis), [settled, analysis]);
  const face = useMemo(() => faceFor(settled, analysis), [settled, analysis]);
  const themed = settled.hits.length > 0;
  const color = themed ? blend.palette.accent : "#8FB4FF";

  const reduce = useReducedMotion();
  const gulp = mood.hits.length;

  const pick = (e: string) => { setTouched(true); setText(e); area.current?.focus(); };

  return (
    <div className={s.writer}>
      <div className={`grid-paper ${s.page}`}>
        <MarginDoodles text={live} quiet={!touched} max={5} />
        <label className={s.field}>
          <span className="visually-hidden">One line about today</span>
          <textarea
            ref={area}
            rows={3}
            maxLength={400}
            data-face={face.key}
            style={{ fontFamily: face.family, fontSize: `calc(clamp(1.25rem, 2.1vw, 1.65rem) * ${face.scale})`, fontWeight: face.weight }}
            value={touched ? text : ""}
            placeholder={touched ? "One line about today" : `${demo}▍`}
            onFocus={() => { if (!touched) { setTouched(true); setText(""); } }}
            onChange={(e) => { setTouched(true); setText(e.target.value); }}
            onKeyDown={() => sfx.scratch()}
          />
        </label>
        <div className={s.foot}>
          <Link href={text.trim() ? `/new?text=${encodeURIComponent(text.trim())}` : "/new"} className="btn btn-primary">
            {text.trim() ? "Keep writing this day" : "Start today’s page"}
          </Link>
          <span className={s.tries}>
            Try
            {EXAMPLES.slice(0, 3).map((e) => (
              <button key={e} type="button" onClick={() => pick(e)}>“{e.split(" ").slice(0, 3).join(" ")}…”</button>
            ))}
          </span>
        </div>
      </div>

      <div className={s.mote}>
        {/* every mood word the pen finds becomes a drop of ink that flies into Mote */}
        {!reduce && (
          <div className={s.drops} aria-hidden>
            {mood.hits.map((h, i) => (
              <motion.i
                key={`${i}-${h.word}`}
                style={{ background: h.score > 0 ? color : "#6E7FA8" }}
                initial={{ x: -260, y: 70, scale: 0.6, opacity: 0 }}
                animate={{ x: [-260, -130, 0], y: [70, -70, 0], scale: [0.6, 1, 0.35], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
                onAnimationComplete={() => { if (touched) sfx.plop(); }}
              />
            ))}
          </div>
        )}
        <motion.div
          className={s.body}
          animate={reduce ? undefined : { scale: gulp % 2 ? [1, 0.9, 1.05, 1] : [1, 0.91, 1.04, 1] }}
          transition={{ duration: 0.5, delay: gulp ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <MoodDoodle mood={mood} color={color} size={150} follow />
        </motion.div>
        <p className="hand">feels {WORD[mood.mood]}</p>
        <p className={s.counts}>{mood.positive} good · {mood.negative} hard · {face.label}</p>
      </div>
    </div>
  );
}
