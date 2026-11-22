"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/client/sound";
import { MOOD } from "@/lib/moods";
import type { DayMood } from "@/lib/types";
import s from "./Flipbook.module.css";

export interface FlipDay {
  id: string;
  day: string;
  title: string;
  mood: DayMood;
  cover: string | null;
  accent: string;
  excerpt: string;
}

type Leaf = { kind: "cover" } | { kind: "day"; d: FlipDay } | { kind: "end" };

const PX_PER_LEAF = 90;

/**
 * The year as a flipbook. Drag the page (or the corner) to riffle through every day —
 * its colour, photo and mood flicker past like a flip-book; let go and it settles on a day.
 */
export function Flipbook({ days, year }: { days: FlipDay[]; year: number }) {
  const leaves: Leaf[] = [{ kind: "cover" }, ...days.map((d) => ({ kind: "day" as const, d })), { kind: "end" }];
  const last = leaves.length - 1;
  const pos = useMotionValue(0);
  const [at, setAt] = useState(0);
  const reduce = useReducedMotion();
  const drag = useRef<{ x: number; p: number } | null>(null);
  const moved = useRef(false);

  useMotionValueEvent(pos, "change", (v) => {
    const i = Math.min(last, Math.max(0, Math.floor(v + 0.0001)));
    if (i !== at) { setAt(i); sfx.flick(); }
  });

  const settle = useCallback((target: number, fast = false) => {
    const to = Math.min(last, Math.max(0, Math.round(target)));
    animate(pos, to, reduce ? { duration: 0 } : fast ? { type: "spring", stiffness: 260, damping: 30 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] });
  }, [last, pos, reduce]);

  const riffle = () => {
    const from = pos.get() >= last - 0.01 ? 0 : pos.get();
    if (from === 0) pos.set(0);
    animate(pos, last, { duration: reduce ? 0 : Math.min(6, 0.32 * (last - from) + 0.6), ease: [0.45, 0, 0.25, 1] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.key === "ArrowRight") settle(Math.floor(pos.get()) + 1, true);
      if (e.key === "ArrowLeft") settle(Math.ceil(pos.get()) - 1, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pos, settle]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, p: pos.get() };
    moved.current = false;
    pos.stop();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = drag.current.x - e.clientX;
    if (Math.abs(dx) > 4) moved.current = true;
    pos.set(Math.min(last, Math.max(0, drag.current.p + dx / PX_PER_LEAF)));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    settle(pos.get(), true);
  };

  const cur = leaves[at];
  const next = leaves[Math.min(last, at + 1)];

  return (
    <section className={s.wrap} aria-label={`Flip through ${year}`}>
      <div className={s.head}>
        <div>
          <p className="section-label">Flip through the year</p>
          <p className={s.hint}>Drag the page to the left to flip it.</p>
        </div>
        <button type="button" className="btn btn-small" onClick={riffle}>Riffle through it</button>
      </div>

      <div
        className={s.book}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); } }}
      >
        {/* the stack of pages still to come, seen on the right edge */}
        <div className={s.edges} aria-hidden style={{ ["--left" as string]: Math.max(0, last - at - 1) }}>
          {Array.from({ length: Math.min(6, Math.max(0, last - at - 1)) }, (_, i) => <i key={i} style={{ ["--k" as string]: i + 1 }} />)}
        </div>
        {/* the page underneath, already waiting */}
        <div className={s.page}>{at < last ? <Face leaf={next} year={year} count={days.length} /> : <Face leaf={cur} year={year} count={days.length} />}</div>
        {/* the leaf being turned */}
        {at < last && <TurningLeaf pos={pos} at={at}><Face leaf={cur} year={year} count={days.length} /></TurningLeaf>}
        <span className={s.corner} aria-hidden />
      </div>

      <div className={s.track} aria-hidden>
        {leaves.map((l, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            data-on={i === at || undefined}
            style={{ background: l.kind === "day" ? MOOD[l.d.mood].color : "var(--line-strong)" }}
            onClick={() => settle(i)}
          />
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">{cur.kind === "day" ? `${cur.d.title}, ${cur.d.day}` : cur.kind === "cover" ? `${year}` : "The end"}</p>
    </section>
  );
}

function TurningLeaf({ pos, at, children }: { pos: MotionValue<number>; at: number; children: React.ReactNode }) {
  // the fraction of this leaf that has turned: 0 → lying flat, 1 → turned over
  const turned = useTransform(pos, (v) => Math.min(1, Math.max(0, v - at)));
  const rotateY = useTransform(turned, [0, 1], [0, -178]);
  const shade = useTransform(turned, [0, 0.5, 1], [0, 0.18, 0]);
  const lift = useTransform(turned, [0, 0.5, 1], [0, 18, 0]);
  return (
    <motion.div className={s.leaf} style={{ rotateY, z: lift }}>
      <div className={s.front}>
        {children}
        <motion.i className={s.shade} style={{ opacity: shade }} />
      </div>
      <div className={`grid-paper ${s.back}`} />
    </motion.div>
  );
}

function Face({ leaf, year, count }: { leaf: Leaf; year: number; count: number }) {
  if (leaf.kind === "cover") {
    return (
      <div className={s.cover}>
        <p className="hand">my notebook</p>
        <h3 className="display">{year}</h3>
        <p>{count} day{count === 1 ? "" : "s"} inside</p>
      </div>
    );
  }
  if (leaf.kind === "end") {
    return (
      <div className={`grid-paper ${s.end}`}>
        <p className="hand">the next page is empty</p>
        <Link href="/new" className="btn btn-primary">Write today</Link>
      </div>
    );
  }
  const d = leaf.d;
  const m = MOOD[d.mood];
  return (
    <Link href={`/m/${d.id}`} className={s.day} draggable={false}>
      <span className={s.wash} style={{ background: d.accent }} aria-hidden />
      {d.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.cover} alt="" draggable={false} decoding="async" />
      )}
      <span className={`hand ${s.date}`}>{new Date(`${d.day}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</span>
      <strong className={s.title}>{d.title}</strong>
      <span className={s.mood}><i style={{ background: m.color }} />{m.label.toLowerCase()}</span>
      <span className={s.excerpt}>{d.excerpt}</span>
    </Link>
  );
}
