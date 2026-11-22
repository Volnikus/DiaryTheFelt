"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntrySummary } from "@/lib/types";
import { MOODS } from "@/lib/moods";
import type { DayMood } from "@/lib/types";
import { MemoryCard } from "./MemoryCard";
import { TossIn } from "./TossIn";
import { MoodCalendar } from "./MoodCalendar";
import s from "./Archive.module.css";

type Summary = Omit<EntrySummary, "keywords">;
type Scope = "all" | "mine" | "demo";

export function Archive({ initial }: { initial: Summary[] }) {
  const [entries, setEntries] = useState(initial);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [mood, setMood] = useState<DayMood | "">("");
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams({ scope });
        if (q.trim()) p.set("q", q.trim());
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        if (mood) p.set("mood", mood);
        const res = await fetch(`/api/memories?${p}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        setEntries((await res.json()).entries);
      } catch {
        if (!ctrl.signal.aborted) setError("The archive could not be loaded. Check your connection and try again.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, from, to, scope, mood]);

  const groups = useMemo(() => {
    const map = new Map<string, Summary[]>();
    for (const e of entries) {
      const key = e.day.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [entries]);

  const filtered = q || from || to || mood || scope !== "all";
  const mine = initial.filter((e) => !e.demo).length;

  return (
    <div>
      <div className={`glass glass-blur ${s.controls}`}>
        <label className={s.search}>
          <span className="visually-hidden">Search memories</span>
          <input className="input" type="search" placeholder="Search titles, words, songs, moods…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className={s.dates}>
          <label><span className="meta">From</span><input className="input" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label><span className="meta">To</span><input className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="segmented" role="group" aria-label="Show">
          {(["all", "mine", "demo"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)}>
              {v === "all" ? "All" : v === "mine" ? "My days" : "Demonstrations"}
            </button>
          ))}
        </div>
        {filtered && <button type="button" className="btn btn-small btn-ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); setScope("all"); setMood(""); }}>Clear</button>}
        <div className={s.moods} role="group" aria-label="Filter by mood">
          {MOODS.map((m) => (
            <button key={m.key} type="button" className={s.moodChip} aria-pressed={mood === m.key} onClick={() => setMood((v) => (v === m.key ? "" : m.key))} style={{ "--chip": m.color } as React.CSSProperties}>
              <i />{m.label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
          <button type="button" aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>Mood calendar</button>
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}
      {view === "calendar" && entries.length > 0 && <div className={s.calendar}><MoodCalendar entries={entries} /></div>}

      {loading && entries.length === 0 ? (
        <div className={s.grid}>{[0, 1, 2].map((i) => <div key={i} className={`${s.ghost} skeleton`} />)}</div>
      ) : entries.length === 0 ? (
        <div className={s.empty}>
          {filtered ? (
            <>
              <h2 className="display">Nothing developed for that search.</h2>
              <p className="muted">Try another word or widen the dates.</p>
            </>
          ) : (
            <>
              <h2 className="display">Your archive is waiting for its first day.</h2>
              <Link href="/new" className="btn btn-primary">Write today</Link>
            </>
          )}
        </div>
      ) : view === "calendar" ? null : (
        <div className={loading ? s.dim : undefined}>
          {groups.map(([month, list]) => (
            <section key={month} className={`cv ${s.month}`}>
              <h2 className={s.monthTitle}>
                {new Date(`${month}-15T12:00:00`).toLocaleDateString("en-GB", { month: "long" })}
                <span>{month.slice(0, 4)}</span>
              </h2>
              <div className={s.grid}>
                {list.map((e, i) => (
                  <TossIn key={e.id} tilt={[-1, 0.8, -0.4][i % 3]} index={i % 6}>
                    <MemoryCard entry={{ ...e, keywords: "" }} priority={i < 3} />
                  </TossIn>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!filtered && mine === 0 && entries.length > 0 && (
        <div className={`glass ${s.nudge}`}>
          <p>The days above are demonstrations. Your own memories will appear here, in order, alongside them.</p>
          <Link href="/new" className="btn btn-primary">Write your first day</Link>
        </div>
      )}
    </div>
  );
}

export function DiaryKey() {
  const [key, setKey] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [other, setOther] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/diary-key").then((r) => r.json()).then((j) => setKey(j.key)).catch(() => undefined);
  }, []);

  const open = async () => {
    setMsg(null);
    const res = await fetch("/api/diary-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: other }) });
    if (!res.ok) return setMsg((await res.json()).error ?? "That key did not work");
    window.location.reload();
  };

  return (
    <section className={`glass ${s.key}`}>
      <div>
        <p className="meta">Your diary key</p>
        <p className={s.keyText}>
          Your entries are private to this key — there is no public profile. Copy it to open the same diary on another device.
        </p>
      </div>
      <div className={s.keyActions}>
        <code className={s.code}>{key ? (shown ? key : `${key.slice(0, 6)}••••••••••••${key.slice(-4)}`) : "…"}</code>
        <button type="button" className="btn btn-small" onClick={() => setShown((v) => !v)}>{shown ? "Hide" : "Show"}</button>
        <button type="button" className="btn btn-small" onClick={() => key && navigator.clipboard.writeText(key).then(() => setMsg("Copied."))}>Copy</button>
      </div>
      <form className={s.keyActions} onSubmit={(e) => { e.preventDefault(); void open(); }}>
        <input className="input" placeholder="Paste a diary key to open it here" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Diary key" />
        <button className="btn btn-small" disabled={!other.trim()}>Open diary</button>
      </form>
      {msg && <p className="meta">{msg}</p>}
    </section>
  );
}
