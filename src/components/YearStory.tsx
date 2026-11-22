"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { shareYear } from "@/lib/client/year-card";
import { MOOD } from "@/lib/moods";
import { StoryButton } from "./StoryButton";
import type { YearStats } from "@/lib/year";
import s from "./YearStory.module.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DURATION = 6500;

type Slide = { key: string; bg: string; body: React.ReactNode };

function slidesFor(st: YearStats): Slide[] {
  const top = st.topMood ? MOOD[st.topMood] : null;
  const total = st.moods.reduce((n, m) => n + m.count, 0) || 1;
  const out: Slide[] = [
    {
      key: "intro",
      bg: "#F2F2EF",
      body: (
        <>
          <p className={s.kicker}>{st.demo ? "a preview with the demonstration days" : `your ${st.year}`}</p>
          <h2 className={s.huge}>{st.days}</h2>
          <p className={s.line}>{st.days === 1 ? "day" : "days"} written down, {st.photos} photograph{st.photos === 1 ? "" : "s"} kept.</p>
          {st.firstDay && <p className={s.small}>it started on {new Date(`${st.firstDay}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</p>}
        </>
      ),
    },
  ];
  if (top) {
    out.push({
      key: "mood",
      bg: `color-mix(in srgb, ${top.color} 22%, #F3EEE4)`,
      body: (
        <>
          <p className={s.kicker}>your year mostly felt</p>
          <h2 className={s.big} style={{ color: top.color }}>{top.label.toLowerCase()}</h2>
          <div className={s.stack}>
            {st.moods.map((m) => (
              <motion.i key={m.mood} title={`${MOOD[m.mood].label}: ${m.count}`} style={{ background: MOOD[m.mood].color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: m.count / total }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            ))}
          </div>
          <ul className={s.list}>
            {st.moods.map((m) => <li key={m.mood}><i style={{ background: MOOD[m.mood].color }} />{MOOD[m.mood].label}<em>{Math.round((m.count / total) * 100)}%</em></li>)}
          </ul>
        </>
      ),
    });
  }
  out.push({
    key: "colours",
    bg: "#F3EEE4",
    body: (
      <>
        <p className={s.kicker}>the colour of each month</p>
        <div className={s.months}>
          {st.months.map((m) => (
            <div key={m.month} className={s.monthCell}>
              <span className={s.swatch} style={{ background: m.colors[0] ?? "rgba(31,29,26,0.06)", boxShadow: m.colors[1] ? `inset -10px -10px 0 ${m.colors[1]}` : undefined }} />
              <em>{MONTHS[m.month]}</em>
            </div>
          ))}
        </div>
      </>
    ),
  });
  if (st.words.length) {
    out.push({
      key: "words",
      bg: "#EFE3CC",
      body: (
        <>
          <p className={s.kicker}>words you kept coming back to</p>
          <div className={s.cloud}>
            {st.words.map((w, i) => (
              <motion.span key={w.word} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }} style={{ fontSize: `${Math.max(1, 2.6 - i * 0.14)}rem` }}>
                {w.word}
              </motion.span>
            ))}
          </div>
        </>
      ),
    });
  }
  if (st.songs.length || st.bpm) {
    out.push({
      key: "music",
      bg: "#DDE5D8",
      body: (
        <>
          <p className={s.kicker}>the soundtrack</p>
          {st.songs[0] && <h2 className={s.mid}>{st.songs[0].song}</h2>}
          {st.bpm && <p className={s.line}>your days moved at about <b>{st.bpm} bpm</b>.</p>}
          {st.songs.length > 1 && <ol className={s.songs}>{st.songs.slice(1).map((x) => <li key={x.song}>{x.song}</li>)}</ol>}
        </>
      ),
    });
  }
  out.push({
    key: "moments",
    bg: "#E4E0EC",
    body: (
      <>
        <p className={s.kicker}>moments</p>
        {st.streak > 1 && <p className={s.line}>longest streak: <b>{st.streak} days</b> in a row.</p>}
        <div className={s.moments}>
          {st.brightest && <Moment label="brightest day" m={st.brightest} />}
          {st.bravest && <Moment label="the day you got through" m={st.bravest} />}
        </div>
      </>
    ),
  });
  out.push({
    key: "end",
    bg: "#F4D8CC",
    body: (
      <>
        <p className={s.kicker}>{st.demo ? "now make it yours" : "thank you for every day"}</p>
        <h2 className={s.big}>{st.demo ? "write your first day." : "keep feeling."}</h2>
        <div className={s.actions}>
          <Link href="/new" className="btn btn-primary">New day</Link>
          <Link href="/archive" className="btn">Archive</Link>
        </div>
      </>
    ),
  });
  return out;
}

function Moment({ label, m }: { label: string; m: NonNullable<YearStats["brightest"]> }) {
  return (
    <Link href={`/m/${m.id}`} className={s.moment}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {m.cover && <img src={m.cover} alt="" loading="lazy" />}
      <span><em>{label}</em><strong>{m.title}</strong></span>
    </Link>
  );
}

export function YearStory({ stats, years }: { stats: YearStats; years: number[] }) {
  const slides = slidesFor(stats);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((d: number) => setI((v) => Math.min(slides.length - 1, Math.max(0, v + d))), [slides.length]);

  useEffect(() => {
    if (paused || i >= slides.length - 1) return;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [i, paused, go, slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = slides[i];
  return (
    <div className={s.shell}>
      {years.length > 1 && (
        <nav className="segmented" aria-label="Year">
          {years.map((y) => <a key={y} href={`/year?y=${y}`} aria-current={y === stats.year ? "page" : undefined} className={s.yearLink}>{y}</a>)}
        </nav>
      )}
      <div
        className={s.story}
        style={{ background: slide.bg }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className={s.bars} aria-hidden>
          {slides.map((x, n) => (
            <span key={x.key}><i className={n < i ? s.done : n === i ? (paused ? s.paused : s.run) : undefined} style={{ animationDuration: `${DURATION}ms` }} /></span>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={slide.key} className={s.body} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            {slide.body}
          </motion.div>
        </AnimatePresence>
        <button type="button" className={s.prev} onClick={() => go(-1)} aria-label="Previous" disabled={i === 0} />
        <button type="button" className={s.next} onClick={() => go(1)} aria-label="Next" disabled={i === slides.length - 1} />
        <p className={s.count} aria-live="polite">{i + 1} / {slides.length}</p>
      </div>
      <StoryButton make={() => shareYear(stats)} label={stats.demo ? "Preview as Instagram Story" : "Share my year to Instagram"} />
    </div>
  );
}
