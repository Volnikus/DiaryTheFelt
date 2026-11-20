import type { Season, TimeOfDay } from "../types.ts";
import { SHARED_VERBS, TIME_WORDS, type MotifKind } from "../analysis/lexicon.ts";
import { hashString } from "./random.ts";

interface TitleInput {
  valence: number;
  arousal: number;
  nostalgia: number;
  tension: number;
  togetherness: number;
  warmth: number;
  timeOfDay: TimeOfDay;
  season: Season;
  motifs: { label: string; kind: MotifKind }[];
  text: string;
}

const TIME_NOUN: Record<TimeOfDay, string> = {
  dawn: "Dawn", morning: "Morning", afternoon: "Afternoon", "golden-hour": "Golden Hour",
  evening: "Evening", night: "Night", "late-night": "Midnight", unknown: "Day",
};

const LIGHT: Record<Season, string> = {
  spring: "Spring Light", summer: "Summer Light", autumn: "Autumn Light", winter: "Winter Light", unknown: "Soft Light",
};

const EVENT_NOUNS = ["deadline", "exam", "launch", "presentation", "flight", "interview", "storm", "concert", "release", "match"];

export function makeTitle(input: TitleInput): string {
  const seed = hashString(input.text);
  const time = TIME_NOUN[input.timeOfDay];
  const motifs = input.motifs.map((m) => m.label);
  const objectMotifs = input.motifs.filter((m) => m.kind !== "people" && m.label !== "Deadline").map((m) => m.label);
  const event = EVENT_NOUNS.find((e) => new RegExp(`\\b${e}`).test(input.text));
  const verbHit = SHARED_VERBS.map((v) => ({ v, i: input.text.search(new RegExp(`\\bwe\\s+(\\w+\\s+)?${v}\\b`)) }))
    .filter((h) => h.i >= 0)
    .sort((a, b) => a.i - b.i)[0];
  const verb = verbHit?.v;
  const verbSentence = verbHit ? input.text.slice(input.text.lastIndexOf(".", verbHit.i) + 1, input.text.indexOf(".", verbHit.i) >>> 0) : "";
  const verbTime = (TIME_WORDS[input.timeOfDay] ?? []).some((w) => verbSentence.includes(w.trim())) ? time : "Day";
  const candidates: [string, number][] = [];

  if (event) {
    candidates.push([`${time === "Day" ? "The Night" : time} Before the ${cap(event)}`, 0.5 + input.tension]);
    if (objectMotifs[0]) candidates.push([`${objectMotifs[0]} Until the ${cap(event)}`, 0.3 + input.tension * 0.8]);
  }
  if (verb && input.togetherness > 0.45) {
    candidates.push([`The ${verbTime} We ${cap(verb)}`, 0.6 + input.togetherness * 0.5 + input.nostalgia * 0.3]);
  }
  if (objectMotifs[0]) {
    const light = input.season !== "unknown" ? LIGHT[input.season] : input.timeOfDay !== "unknown" ? `${time} Light` : "Soft Light";
    candidates.push([`${light} and ${objectMotifs.find((m) => !light.includes(m)) ?? objectMotifs[0]}`, 0.55 + input.warmth * 0.3 + input.nostalgia * 0.3]);
  }
  if (objectMotifs.length >= 3) {
    candidates.push([`${objectMotifs[0]}, ${objectMotifs[1]} and ${objectMotifs[2]}`, 0.5 + input.arousal * 0.4]);
  }
  if (motifs.includes("Friends") && objectMotifs[0]) {
    const adj = input.valence > 0.3 ? (input.arousal > 0.55 ? "Loud" : "Easy") : "Quiet";
    candidates.push([`${objectMotifs[0]}, Friends and ${adj} ${input.arousal > 0.55 ? "Laughter" : "Hours"}`, 0.45 + input.togetherness * 0.5]);
  }
  if (input.season !== "unknown" && objectMotifs[0]) {
    candidates.push([`A ${cap(input.season)} ${time === "Day" ? "Day" : time} of ${objectMotifs[0]}`, 0.4 + input.nostalgia * 0.3]);
  }
  if (input.tension > 0.5) {
    candidates.push([`${time === "Day" ? "Hours" : time} of Bright Focus`, 0.35 + input.tension * 0.6]);
  }
  if (input.valence > 0.4 && input.arousal > 0.55) {
    candidates.push([`Everything Bright at ${time === "Golden Hour" ? "Golden Hour" : `the ${time === "Day" ? "Shore" : time}`}`, 0.35 + input.valence * 0.4]);
  }
  if (input.arousal < 0.4) {
    candidates.push([`A Slow ${time === "Day" ? "Day" : time}${objectMotifs[0] ? ` of ${objectMotifs[0]}` : ""}`, 0.4 + (1 - input.arousal) * 0.3]);
  }
  candidates.push([`The ${time} That Kept Its Colour`, 0.2]);

  candidates.sort((a, b) => b[1] - a[1]);
  const top = candidates.filter(([, s]) => s >= candidates[0][1] - 0.08);
  const chosen = top[seed % top.length][0];
  return chosen.split(/\s+/).slice(0, 7).join(" ");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
