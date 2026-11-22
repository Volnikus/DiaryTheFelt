import type { DayMood, EntrySummary } from "./types";
import { topWords } from "./year";

/*
 * Weekly and monthly recaps: the days of one week (Monday to Sunday) or one month,
 * read together — the mood they mostly had, the words that came back, the song that
 * played most, the photos — ready to be drawn as an Instagram card.
 */

export interface RecapDay {
  id: string;
  day: string;
  title: string;
  mood: DayMood;
  accent: string;
  cover: string | null;
  text: string;
}

export interface Recap {
  kind: "week" | "month";
  key: string;
  /** "5–11 October" or "October" */
  label: string;
  /** the year, or "week 41 · 2026" */
  sub: string;
  start: string;
  end: string;
  days: RecapDay[];
  moods: { mood: DayMood; count: number }[];
  topMood: DayMood;
  words: string[];
  song: { name: string; bpm: number; envelope: number[]; count: number } | null;
  photos: number;
  covers: string[];
  streak: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RANK: DayMood[] = ["radiant", "bright", "calm", "mixed", "blank", "low", "stormy"];

// everyday verbs and fillers that say little about a week
const WEAK = new Set("said came whole told took tried think thought know knew want wanted kind maybe actually honestly started stopped looked felt went got made gave left kept turned asked".split(" "));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (day: string) => new Date(`${day}T12:00:00Z`);

/** Monday of the week the day belongs to. */
export function weekStart(day: string): string {
  const d = at(day);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return iso(d);
}

function isoWeek(day: string) {
  const d = at(day);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

function build(kind: Recap["kind"], key: string, start: string, end: string, list: EntrySummary[]): Recap {
  const sorted = [...list].sort((a, b) => a.day.localeCompare(b.day));
  const moodCount = new Map<DayMood, number>();
  for (const e of sorted) moodCount.set(e.mood ?? "blank", (moodCount.get(e.mood ?? "blank") ?? 0) + 1);
  const moods = [...moodCount].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count || RANK.indexOf(a.mood) - RANK.indexOf(b.mood));

  const songs = new Map<string, { name: string; bpm: number; envelope: number[]; count: number }>();
  for (const e of sorted) {
    if (!e.song || /^https?:/.test(e.song)) continue;
    const s = songs.get(e.song) ?? { name: e.song.replace(/\s+—\s+original demo track$/, ""), bpm: e.bpm, envelope: e.envelope, count: 0 };
    s.count++;
    songs.set(e.song, s);
  }
  const song = [...songs.values()].sort((a, b) => b.count - a.count)[0] ?? null;
  // only the writer's own words: not the song's name, not the mood words Felt itself added
  const songWords = new Set(sorted.flatMap((e) => `${e.song} ${e.atmosphere}`.toLowerCase().match(/[\p{L}']+/gu) ?? []));

  // the brightest days lead the photos, and no photo twice
  const covers = [...new Set([...sorted].sort((a, b) => RANK.indexOf(a.mood ?? "blank") - RANK.indexOf(b.mood ?? "blank")).map((e) => e.cover).filter((c): c is string => Boolean(c)))];

  const days = [...new Set(sorted.map((e) => e.day))];
  let streak = days.length ? 1 : 0, run = 1;
  for (let i = 1; i < days.length; i++) {
    run = (at(days[i]).getTime() - at(days[i - 1]).getTime()) / 86400000 === 1 ? run + 1 : 1;
    streak = Math.max(streak, run);
  }

  const s = at(start), e = at(end);
  const label = kind === "month"
    ? MONTHS[s.getUTCMonth()]
    : s.getUTCMonth() === e.getUTCMonth()
      ? `${s.getUTCDate()}–${e.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`
      : `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()].slice(0, 3)} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()].slice(0, 3)}`;
  const sub = kind === "month" ? String(s.getUTCFullYear()) : `week ${isoWeek(start)} · ${e.getUTCFullYear()}`;

  return {
    kind, key, label, sub, start, end,
    days: sorted.map((x) => ({ id: x.id, day: x.day, title: x.title, mood: x.mood ?? "blank", accent: x.palette.accent, cover: x.cover, text: `${x.excerpt} ${x.keywords}` })),
    moods,
    topMood: moods[0]?.mood ?? "blank",
    // words from the song's name are not the writer's words
    words: topWords(sorted, 80).map((w) => w.word).filter((w) => !songWords.has(w) && !WEAK.has(w)).slice(0, 6),
    song,
    photos: sorted.reduce((n, x) => n + x.photoCount, 0),
    covers,
    streak,
  };
}

/** Every week and month that has at least one page, newest first. Uses the demonstration days until you have your own. */
export function recapsFrom(all: EntrySummary[]): { weeks: Recap[]; months: Recap[]; demo: boolean } {
  const own = all.filter((e) => !e.demo);
  const demo = own.length === 0;
  const list = demo ? all.filter((e) => e.demo) : own;

  const byWeek = new Map<string, EntrySummary[]>();
  const byMonth = new Map<string, EntrySummary[]>();
  for (const e of list) {
    const w = weekStart(e.day);
    byWeek.set(w, [...(byWeek.get(w) ?? []), e]);
    const m = e.day.slice(0, 7);
    byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
  }

  const weeks = [...byWeek].map(([start, l]) => {
    const end = at(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return build("week", start, start, iso(end), l);
  });
  const months = [...byMonth].map(([m, l]) => {
    const [y, mo] = m.split("-").map(Number);
    return build("month", m, `${m}-01`, iso(new Date(Date.UTC(y, mo, 0, 12))), l);
  });
  const newest = (a: Recap, b: Recap) => b.start.localeCompare(a.start);
  return { weeks: weeks.sort(newest), months: months.sort(newest), demo };
}
