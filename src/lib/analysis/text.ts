import type { Pacing, Season, Setting, TextAnalysis, TimeOfDay } from "../types.ts";
import {
  AFFECT, INDOOR, INTENSIFIERS, MOTIFS, NEGATIONS, OUTDOOR, SEASON_WORDS, TIME_WORDS, WEATHER_WORDS,
  MOTIF_WEIGHT, type MotifKind, type Nudge,
} from "./lexicon.ts";
import { makeTitle } from "../engine/title.ts";

const STEMS = Object.keys(AFFECT).sort((a, b) => b.length - a.length);

function stemFor(token: string): string | null {
  for (const stem of STEMS) {
    if (stem.length <= 3 ? token === stem : token.startsWith(stem)) return stem;
  }
  return null;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[’']/g, "'").match(/[a-zà-ÿ0-9']+/g) ?? [];
}

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function countPhrases(lower: string, phrases: string[]): { count: number; last: number } {
  let count = 0, last = -1;
  for (const p of phrases) {
    const re = new RegExp(`\\b${p.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es)?\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) { count++; last = Math.max(last, m.index); }
  }
  return { count, last };
}

function pick<T extends string>(lower: string, table: Record<string, string[]>, fallback: T): T {
  let best: string = fallback, bestCount = 0, bestLast = -1;
  for (const [key, words] of Object.entries(table)) {
    const { count, last } = countPhrases(lower, words);
    if (count > bestCount || (count === bestCount && count > 0 && last > bestLast)) {
      best = key; bestCount = count; bestLast = last;
    }
  }
  return best as T;
}

export interface MotifHit { label: string; kind: MotifKind; count: number; first: number }

export function findMotifs(lower: string): MotifHit[] {
  const hits: MotifHit[] = [];
  for (const m of MOTIFS) {
    const { count } = countPhrases(lower, m.words);
    if (!count) continue;
    const first = Math.min(...m.words.map((w) => { const i = lower.search(new RegExp(`\\b${w}(?:s|es)?\\b`)); return i < 0 ? Infinity : i; }));
    hits.push({ label: m.label, kind: m.kind, count, first });
  }
  return hits.sort((a, b) => b.count * MOTIF_WEIGHT[b.kind] - a.count * MOTIF_WEIGHT[a.kind] || a.first - b.first);
}

export function analyzeTextLocally(text: string): TextAnalysis {
  const lower = ` ${text.toLowerCase()} `;
  const tokens = tokenize(text);
  const acc = { v: 0, a: 0, n: 0, t: 0, s: 0, w: 0 };
  const hits = { v: 0, a: 0, n: 0, t: 0, s: 0, w: 0 };

  tokens.forEach((tok, i) => {
    const stem = stemFor(tok);
    if (!stem) return;
    const nudge: Nudge = AFFECT[stem];
    const negated = [tokens[i - 1], tokens[i - 2]].some((p) => p && (NEGATIONS.has(p) || p.endsWith("n't")));
    const boost = tokens[i - 1] && INTENSIFIERS.has(tokens[i - 1]) ? 1.4 : 1;
    for (const [k, val] of Object.entries(nudge) as [keyof typeof acc, number][]) {
      const signed = negated ? (k === "v" ? -val : val * 0.3) : val;
      acc[k] += signed * boost;
      hits[k] += 1;
    }
  });

  const exclaims = (text.match(/!/g) ?? []).length;
  const sentenceList = sentences(text);
  const avgLen = tokens.length / Math.max(1, sentenceList.length);
  const squash = (k: keyof typeof acc, scale = 1.6) => Math.tanh(acc[k] / Math.sqrt(hits[k] + 1) * scale);

  const valence = squash("v");
  const arousal = clamp(0.42 + squash("a") * 0.5 + Math.min(0.2, exclaims * 0.05) + (avgLen < 9 ? 0.05 : 0));
  const nostalgia = clamp(squash("n", 1.3));
  const tension = clamp(squash("t", 1.4));
  const togetherness = clamp(0.3 + squash("s") * 0.7);
  const warmth = clamp(0.5 + squash("w") * 0.5);

  const timeOfDay = pick<TimeOfDay>(lower, TIME_WORDS, "unknown");
  const season = pick<Season>(lower, SEASON_WORDS, "unknown");
  const weather = Object.entries(WEATHER_WORDS)
    .filter(([, words]) => countPhrases(lower, words).count > 0)
    .map(([k]) => k);
  const indoor = countPhrases(lower, INDOOR).count;
  const outdoor = countPhrases(lower, OUTDOOR).count;
  const setting: Setting =
    indoor === 0 && outdoor === 0 ? "unknown" : indoor > outdoor * 1.5 ? "indoor" : outdoor > indoor * 1.5 ? "outdoor" : "mixed";

  const motifHits = findMotifs(lower);
  const motifs = motifHits.slice(0, 6).map((m) => m.label);

  const intensity = clamp(arousal * 0.55 + tension * 0.3 + Math.min(0.15, exclaims * 0.04));
  let pacing: Pacing = "flowing";
  if (arousal < 0.38 && tension < 0.4) pacing = "still";
  else if (tension > 0.55 && valence < 0.1 && arousal > 0.6) pacing = "restless";
  else if (arousal > 0.6 || tension > 0.5) pacing = "driving";

  const feelings = describeFeelings({ valence, arousal, nostalgia, tension, togetherness, warmth });
  const events = sentenceList
    .filter((s) => /\b(\w+ed|went|ran|swam|met|saw|made|took|found|got|came|sat|drank|ate|sang|wrote|built|spent|left|stayed|talked|walked)\b/i.test(s))
    .slice(0, 4)
    .map((s) => trimWords(s, 14));

  const partial = { valence, arousal, nostalgia, tension, togetherness, warmth, timeOfDay, season, motifs: motifHits, text: lower };
  const title = makeTitle(partial);

  return {
    source: "local",
    summary: trimWords(sentenceList[0] ?? text, 22),
    events,
    atmosphere: feelings.slice(0, 3).join(", "),
    valence: round(valence),
    arousal: round(arousal),
    nostalgia: round(nostalgia),
    tension: round(tension),
    togetherness: round(togetherness),
    warmth: round(warmth),
    intensity: round(intensity),
    pacing,
    timeOfDay,
    season,
    setting,
    weather,
    motifs,
    feelings,
    title,
    atmosphereLine: atmosphereLine({ valence, arousal, nostalgia, tension, togetherness, warmth, timeOfDay, season, motifs }),
    photoNotes: [],
  };
}

type Dims = { valence: number; arousal: number; nostalgia: number; tension: number; togetherness: number; warmth: number };

export function describeFeelings(d: Dims): string[] {
  const out: [string, number][] = [
    ["unhurried", (1 - d.arousal) * 0.9 - d.tension * 0.5],
    ["wistful", d.nostalgia * 0.9 + (0.2 - Math.abs(d.valence)) * 0.3],
    ["tender", d.warmth * 0.6 + d.togetherness * 0.3 - d.arousal * 0.2],
    ["focused", d.tension * 0.8 + 0.1],
    ["electric", d.arousal * 0.8 + d.tension * 0.2 - 0.1],
    ["carefree", d.valence * 0.6 + d.arousal * 0.3 - d.tension * 0.5],
    ["luminous", d.valence * 0.5 + d.warmth * 0.3],
    ["restless", d.tension * 0.5 + d.arousal * 0.4 - d.valence * 0.3 - 0.15],
    ["heavy", -d.valence * 0.8 - 0.1],
    ["shared", d.togetherness * 0.8 - 0.1],
    ["solitary", (1 - d.togetherness) * 0.6 - 0.15],
    ["warm", d.warmth * 0.7 - 0.05],
  ];
  return out.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

const TIME_PHRASE: Record<TimeOfDay, string> = {
  dawn: "the early light", morning: "the morning", afternoon: "the afternoon", "golden-hour": "the low gold sun",
  evening: "the evening", night: "the night", "late-night": "the hours after midnight", unknown: "the day",
};

export function atmosphereLine(d: Dims & { timeOfDay: TimeOfDay; season: Season; motifs: string[] }): string {
  const time = TIME_PHRASE[d.timeOfDay];
  const motif = d.motifs[0]?.toLowerCase();
  const second = d.motifs[1]?.toLowerCase();
  if (d.tension > 0.55) {
    return `${cap(time)} narrowed to a single bright point${motif ? ` — ${motif}` : ""}, and everything else went quiet around it.`;
  }
  if (d.valence > 0.35 && d.arousal > 0.55) {
    return `${cap(time)} kept spilling over${motif ? ` — ${motif}${second ? `, ${second}` : ""}` : ""}, loud and bright${d.togetherness > 0.5 ? " and shared" : ""}.`;
  }
  if (d.nostalgia > 0.45) {
    return `${cap(time)} moved slowly${motif ? `, ${motif}${second ? ` and ${second}` : ""} holding the warmth` : ""}, already feeling like something to look back on.`;
  }
  if (d.arousal < 0.4) {
    return `${cap(time)} stayed soft at the edges${motif ? `, ${motif} at its centre` : ""}, with nothing asking to be hurried.`;
  }
  if (d.valence < -0.3) {
    return `${cap(time)} carried a weight${motif ? ` — ${motif}` : ""} that is easier to hold now that it is written down.`;
  }
  return `${cap(time)}${d.season !== "unknown" ? ` in ${d.season}` : ""}${motif ? `, ${motif}` : ""} — ordinary on the surface, its own colour underneath.`;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 100) / 100;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function trimWords(s: string, n: number) {
  const words = s.split(/\s+/);
  return words.length <= n ? s : `${words.slice(0, n).join(" ")}…`;
}
