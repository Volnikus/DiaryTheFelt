"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MOOD, MOODS } from "@/lib/moods";
import type { DayMood, EntrySummary } from "@/lib/types";
import s from "./MoodCalendar.module.css";

type Day = Pick<EntrySummary, "id" | "day" | "title" | "mood">;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A year of days, each coloured by how it felt. Tap a day to open it. */
export function MoodCalendar({ entries, year: initialYear }: { entries: Day[]; year?: number }) {
  const years = useMemo(() => {
    const ys = new Set(entries.map((e) => Number(e.day.slice(0, 4))));
    ys.add(new Date().getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [entries]);
  const [year, setYear] = useState(initialYear ?? years[0]);

  const byDay = useMemo(() => {
    const m = new Map<string, Day[]>();
    for (const e of entries) if (e.day.startsWith(String(year))) m.set(e.day, [...(m.get(e.day) ?? []), e]);
    return m;
  }, [entries, year]);

  const counts = useMemo(() => {
    const c: Partial<Record<DayMood, number>> = {};
    for (const list of byDay.values()) for (const e of list) c[e.mood ?? "blank"] = (c[e.mood ?? "blank"] ?? 0) + 1;
    return c;
  }, [byDay]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className={s.wrap} aria-label={`Mood calendar ${year}`}>
      <div className={s.top}>
        <div className="segmented" role="group" aria-label="Year">
          {years.slice(0, 4).map((y) => (
            <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <ul className={s.legend}>
          {MOODS.map((m) => (
            <li key={m.key}><i style={{ background: m.color }} />{m.label}{counts[m.key] ? <em>{counts[m.key]}</em> : null}</li>
          ))}
        </ul>
      </div>
      <div className={s.months}>
        {MONTHS.map((name, mi) => {
          const first = new Date(Date.UTC(year, mi, 1));
          const days = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate();
          const offset = (first.getUTCDay() + 6) % 7; // Monday first
          return (
            <div key={name} className={s.month}>
              <p className={s.mname}>{name}</p>
              <div className={s.grid}>
                {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
                {Array.from({ length: days }, (_, d) => {
                  const key = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                  const list = byDay.get(key);
                  if (!list) return <span key={key} className={s.empty} data-today={key === today || undefined} title={key} />;
                  const e = list[0];
                  const mood = MOOD[e.mood ?? "blank"];
                  return (
                    <Link
                      key={key}
                      href={`/m/${e.id}`}
                      className={s.day}
                      style={{ background: mood.color }}
                      title={`${key} · ${e.title} · ${mood.label}${list.length > 1 ? ` (+${list.length - 1})` : ""}`}
                      aria-label={`${key}: ${e.title}, ${mood.label}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
