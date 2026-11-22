"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { drawRecap, shareRecap } from "@/lib/client/recap-card";
import type { CardFormat } from "@/lib/client/postcard";
import { MOOD } from "@/lib/moods";
import type { Recap } from "@/lib/recap";
import s from "./RecapStudio.module.css";

/** A caption to paste under the post, written from the period itself. */
function captionFor(r: Recap) {
  const top = MOOD[r.topMood].label.toLowerCase();
  const what = r.kind === "week" ? `my week (${r.label})` : `${r.label}, page by page`;
  const words = r.words.slice(0, 3).join(", ");
  return `${what} — mostly ${top}. ${r.days.length} page${r.days.length === 1 ? "" : "s"}, ${r.photos} photo${r.photos === 1 ? "" : "s"}${words ? `, and a lot of ${words}` : ""}.${r.song ? ` on repeat: ${r.song.name}.` : ""}\n\n#felt #diary #${r.kind === "week" ? "weeklyrecap" : "monthlyrecap"}`;
}

export function RecapStudio({ weeks, months, demo }: { weeks: Recap[]; months: Recap[]; demo: boolean }) {
  const [kind, setKind] = useState<"week" | "month">("month");
  const [format, setFormat] = useState<CardFormat>("post");
  const list = kind === "week" ? weeks : months;
  // start on the newest week and month that have enough pages to look like something
  const [pick, setPick] = useState<Record<"week" | "month", string>>({
    week: (weeks.find((r) => r.days.length >= 4) ?? weeks[0])?.key ?? "",
    month: (months.find((r) => r.days.length >= 10) ?? months[0])?.key ?? "",
  });
  const recap = list.find((r) => r.key === pick[kind]) ?? list[0];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!recap || !canvas.current) return;
    let alive = true;
    const id = `${recap.kind}-${recap.key}-${format}`;
    void drawRecap(canvas.current, recap, format).then(() => { if (alive) setDrawn(id); });
    return () => { alive = false; };
  }, [recap, format]);

  if (!recap) return <p className={s.empty}>Write a few days first — recaps appear once a week has pages.</p>;

  const save = async () => {
    setBusy(true);
    setNote("");
    try {
      const how = await shareRecap(recap, format);
      setNote(how === "shared" ? "Shared." : how === "downloaded" ? "Saved to your downloads — post it from your phone's gallery." : "");
    } catch {
      setNote("Couldn't draw the card. Try again?");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(captionFor(recap)); setNote("Caption copied."); } catch { setNote("Couldn't copy — select the text instead."); }
  };
  const ready = drawn === `${recap.kind}-${recap.key}-${format}`;

  return (
    <div className={s.studio}>
      <div className={s.controls}>
        <div className="segmented" role="group" aria-label="Recap length">
          <button type="button" aria-pressed={kind === "month"} onClick={() => setKind("month")}>Monthly</button>
          <button type="button" aria-pressed={kind === "week"} onClick={() => setKind("week")}>Weekly</button>
        </div>

        <div className={s.periods} role="listbox" aria-label={kind === "week" ? "Week" : "Month"}>
          {list.map((r) => (
            <button
              key={r.key}
              role="option"
              aria-selected={r.key === recap.key}
              className={s.period}
              onClick={() => setPick((p) => ({ ...p, [kind]: r.key }))}
            >
              <span className={s.dots} aria-hidden>
                {r.days.slice(0, kind === "week" ? 7 : 31).map((d) => <i key={d.id} style={{ background: MOOD[d.mood].color }} />)}
              </span>
              <b>{r.label}</b>
              <em>{r.kind === "week" ? r.sub.split(" · ")[0] : r.sub} · {r.days.length} page{r.days.length === 1 ? "" : "s"}</em>
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Format">
          <button type="button" aria-pressed={format === "post"} onClick={() => setFormat("post")}>Post 4:5</button>
          <button type="button" aria-pressed={format === "story"} onClick={() => setFormat("story")}>Story 9:16</button>
        </div>

        <div className={s.caption}>
          <p className="section-label">Caption</p>
          <p className={s.captionText}>{captionFor(recap)}</p>
          <div className={s.actions}>
            <button className="btn btn-primary" onClick={save} disabled={busy || !ready}>{busy ? "Drawing…" : "Save for Instagram"}</button>
            <button className="btn" onClick={copy}>Copy caption</button>
          </div>
          <p className={s.note} aria-live="polite">{note}</p>
          {demo && <p className={s.fine}>These recaps use the demonstration month. Yours appear here as soon as you keep your own pages.</p>}
        </div>
      </div>

      <div className={s.stage}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${recap.kind}-${recap.key}`}
            className={`${s.sheet} ${format === "story" ? s.story : ""}`}
            initial={{ opacity: 0, y: 40, rotate: 4 }}
            animate={{ opacity: ready ? 1 : 0.4, y: 0, rotate: -1.2 }}
            exit={{ opacity: 0, y: -30, rotate: -6, transition: { duration: 0.3 } }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={`tape ${s.tape}`} aria-hidden />
            <canvas ref={canvas} className={s.canvas} aria-label={`${recap.label} recap card`} role="img" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
