import type { DayMood, EntrySummary } from "./types";

export interface YearStats {
  year: number;
  demo: boolean;
  days: number;
  photos: number;
  moods: { mood: DayMood; count: number }[];
  topMood: DayMood | null;
  months: { month: number; colors: string[]; count: number }[];
  songs: { song: string; count: number }[];
  words: { word: string; count: number }[];
  streak: number;
  bpm: number | null;
  brightest: { id: string; title: string; day: string; cover: string | null } | null;
  bravest: { id: string; title: string; day: string; cover: string | null } | null;
  firstDay: string | null;
}

const STOP = new Set(`the and that this with from have had has was were are been being for not but you your yours they them their there then than what when where which who whom why how all any some just very really also into onto over under again more most much many such only own same too can will would could should about after before because while until each other both few down out off once here once ours ourselves him his her hers its itself she himself herself myself today day days felt feel feeling went got get getting going like little bit lot even still back made make did does doing done one two three first last next time times thing things way something nothing everything anything someone everyone people around though through without within upon among our out its it's i'm i've don't didn't can't won't wasn't isn't
это как так что все она они оно мне меня мой моя мои его еще уже был была было были быть очень когда тоже только потом себя тебя тебе вот там тут где для или ничего сегодня день`.split(/\s+/));

const card = (e: EntrySummary) => ({ id: e.id, title: e.title, day: e.day, cover: e.cover });

export function yearStats(all: EntrySummary[], year: number): YearStats {
  const own = all.filter((e) => !e.demo && e.day.startsWith(String(year)));
  const demo = own.length === 0;
  const list = demo ? all.filter((e) => e.demo) : own;

  const moodCount = new Map<DayMood, number>();
  for (const e of list) moodCount.set(e.mood ?? "blank", (moodCount.get(e.mood ?? "blank") ?? 0) + 1);
  const moods = [...moodCount].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count);

  const months = Array.from({ length: 12 }, (_, m) => {
    const inMonth = list.filter((e) => Number(e.day.slice(5, 7)) === m + 1);
    return { month: m, count: inMonth.length, colors: inMonth.flatMap((e) => [e.palette.accent, e.palette.glow]).slice(0, 8) };
  });

  const songCount = new Map<string, number>();
  for (const e of list) if (e.song && !/^https?:/.test(e.song)) songCount.set(e.song, (songCount.get(e.song) ?? 0) + 1);
  const songs = [...songCount].map(([song, count]) => ({ song, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const wordCount = new Map<string, number>();
  for (const e of list) {
    const seen = new Set<string>();
    for (const w of e.keywords.match(/[\p{L}']{4,}/gu) ?? []) {
      const word = w.toLowerCase();
      if (STOP.has(word) || seen.has(word)) continue;
      seen.add(word);
      wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
    }
  }
  const words = [...wordCount].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 12);

  const days = [...new Set(list.map((e) => e.day))].sort();
  let streak = days.length ? 1 : 0, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (Date.parse(days[i]) - Date.parse(days[i - 1])) / 86400000;
    run = gap === 1 ? run + 1 : 1;
    streak = Math.max(streak, run);
  }

  const bpms = list.map((e) => e.bpm).filter((b) => b > 0);
  const rank: DayMood[] = ["radiant", "bright", "calm", "mixed", "blank", "low", "stormy"];
  const sorted = [...list].sort((a, b) => rank.indexOf(a.mood ?? "blank") - rank.indexOf(b.mood ?? "blank"));
  const hard = sorted.at(-1);

  return {
    year,
    demo,
    days: days.length,
    photos: list.reduce((n, e) => n + e.photoCount, 0),
    moods,
    topMood: moods[0]?.mood ?? null,
    months,
    songs,
    words,
    streak,
    bpm: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
    brightest: sorted[0] ? card(sorted[0]) : null,
    bravest: hard && ["low", "stormy", "mixed"].includes(hard.mood ?? "") ? card(hard) : null,
    firstDay: days[0] ?? null,
  };
}
