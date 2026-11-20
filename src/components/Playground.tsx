"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { countMood, type MoodCount } from "@/lib/analysis/mood";
import { analyzeTextLocally } from "@/lib/analysis/text";
import { blendThemes } from "@/lib/engine/presets";
import { faceFor } from "@/lib/engine/typeface";
import { MoodOrb } from "./MoodOrb";
import s from "./Playground.module.css";

const EXAMPLES = [
  "the sunset made my day, even after a really stressful exam.",
  "a slow rainy morning, tea and nothing to hurry for.",
  "not bad at all — we laughed at the beach until it got dark.",
  "felt a bit lonely today, but my sister called in the evening.",
];

const MOODS: MoodCount["mood"][] = ["radiant", "bright", "calm", "mixed", "low", "stormy"];

/** Home hero: type one line about today and watch it take colour. */
export function Playground() {
  const [text, setText] = useState("");
  const [demo, setDemo] = useState("");
  const [touched, setTouched] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Until the visitor types, the page writes example days by itself.
  useEffect(() => {
    if (touched) return;
    let line = 0, i = 0, pause = 0;
    const t = setInterval(() => {
      const full = EXAMPLES[line % EXAMPLES.length];
      if (pause > 0) { pause--; return; }
      if (i <= full.length) { setDemo(full.slice(0, i)); i++; if (i > full.length) pause = 45; }
      else { line++; i = 0; setDemo(""); }
    }, 55);
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
  const color = themed ? blend.palette.accent : "#FFD83D";
  const vars = { "--accent": color, "--day-glow": themed ? blend.palette.glow : "#FFD83D" } as React.CSSProperties;

  const start = () => { if (!touched) { setTouched(true); setText(""); } };

  return (
    <section className={s.play} style={vars}>
      <div className={s.glow} aria-hidden />
      <div className={`wrap ${s.grid}`}>
        <div className={s.copy}>
          <p className="meta section-label">felt — a diary for how the day felt</p>
          <h1 className={`display ${s.title}`}>how did today <em>feel?</em></h1>
          <p className={s.sub}>type one line. watch it take colour.</p>

          <label className={s.field}>
            <span className="visually-hidden">One line about today</span>
            <textarea
              ref={area}
              rows={2}
              data-face={face.key}
              style={{ fontFamily: face.family, fontSize: `calc(clamp(1.3rem, 2.4vw, 2rem) * ${face.scale})`, fontWeight: face.weight }}
              maxLength={400}
              value={touched ? text : ""}
              placeholder={touched ? "what happened today, and how did it feel?" : `${demo}▍`}
              onFocus={start}
              onChange={(e) => { setTouched(true); setText(e.target.value); }}
            />
          </label>

          <div className={s.row}>
            <Link href={text.trim() ? `/new?text=${encodeURIComponent(text.trim())}` : "/new"} className="btn btn-primary">
              {text.trim() ? "keep writing this day →" : "write today →"}
            </Link>
            <div className={s.tries}>
              {EXAMPLES.slice(0, 3).map((e) => (
                <button key={e} type="button" onClick={() => { setTouched(true); setText(e); area.current?.focus(); }}>
                  {e.split(" ").slice(0, 4).join(" ")}…
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={s.stage}>
          <MoodOrb mood={mood} color={color} size={260} />
          <div className={s.readout}>
            <span>{mood.positive} good · {mood.negative} hard</span>
            <span>{themed ? blend.name.toLowerCase() : "no theme yet"}</span>
            <span>{face.label}</span>
          </div>
        </div>
      </div>

      <ol className={s.moods} aria-label="Moods Felt can read">
        {MOODS.map((m) => (
          <li key={m} data-on={mood.mood === m}>
            <span>{m}</span>
            <AnimatePresence>
              {mood.mood === m && (
                <motion.i layoutId="mood-dot" className={s.dot} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} />
              )}
            </AnimatePresence>
          </li>
        ))}
      </ol>
    </section>
  );
}
