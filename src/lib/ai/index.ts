"use client";

import type { TrackHit } from "../types";
import { analyzeTextLocally } from "../analysis/text";
import { countMood } from "../analysis/mood";
import { complete, completeStream } from "./engine";
import { cleanInput, looksLikeExtraction, scrubReply } from "./guard";
import { REFUSAL_SECRET } from "./prompts";

export type Source = "ai" | "local";
export type { TrackHit };


/** Song search tool: Spotify catalogue (or the public fallback) through Felt's server. */
export async function searchSongs(q: string, limit = 8, signal?: AbortSignal): Promise<{ provider: "spotify" | "itunes"; tracks: TrackHit[] }> {
  const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&limit=${limit}`, { signal });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Search failed");
  return json;
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  const m = raw?.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[0]);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/* ---------- title ---------- */

export async function aiTitle(text: string): Promise<{ title: string; source: Source }> {
  const out = await complete("felt-title", [{ role: "user", content: cleanInput(text, 4000) }]);
  const line = out ? scrubReply(out, 200).split("\n").find((l) => l.trim()) ?? "" : "";
  const words = line.replace(/^(title:\s*)/i, "").replace(/["'«»“”*#]/g, "").replace(/[.!,;:]+$/, "").trim().split(/\s+/).filter(Boolean);
  const clean = words.slice(0, 7).join(" ").replace(/[,;:]+$/, "");
  if (clean && line !== REFUSAL_SECRET && clean.length <= 80 && words.length >= 3 && words.length <= 14) return { title: clean, source: "ai" };
  return { title: analyzeTextLocally(text).title, source: "local" };
}

/* ---------- music: the model proposes, the song search confirms it is real ---------- */

interface SongIdea { title: string; artist: string; bpm: number; energy: number; mode: "major" | "minor"; reason: string }
export type SongPick = SongIdea & { track: TrackHit | null; source: Source };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
const num = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : d;
};
function toSong(o: Record<string, unknown> | null): SongIdea | null {
  if (!o) return null;
  const title = str(o.title, 120), artist = str(o.artist, 120);
  if (!title || !artist) return null;
  return { title, artist, bpm: num(o.bpm, 40, 220, 90), energy: num(o.energy, 0, 1, 0.5), mode: o.mode === "minor" ? "minor" : "major", reason: str(o.reason, 300) ?? "" };
}

const LOCAL_SONGS: Record<string, SongIdea[]> = {
  radiant: [
    { title: "Here Comes the Sun", artist: "The Beatles", bpm: 129, energy: 0.6, mode: "major", reason: "A bright, open day deserves a sunrise of a song." },
    { title: "Walking on Sunshine", artist: "Katrina and the Waves", bpm: 110, energy: 0.85, mode: "major", reason: "Pure sunshine for a day that glowed." },
  ],
  bright: [
    { title: "Lovely Day", artist: "Bill Withers", bpm: 98, energy: 0.5, mode: "major", reason: "Warm and easy, like the good parts of your day." },
    { title: "Banana Pancakes", artist: "Jack Johnson", bpm: 80, energy: 0.4, mode: "major", reason: "Soft and smiling, a day worth lingering in." },
  ],
  calm: [
    { title: "Gymnopédie No. 1", artist: "Erik Satie", bpm: 66, energy: 0.15, mode: "major", reason: "Quiet and unhurried, to keep the day soft at the edges." },
    { title: "Holocene", artist: "Bon Iver", bpm: 74, energy: 0.25, mode: "major", reason: "Slow and spacious, like a calm afternoon." },
  ],
  mixed: [
    { title: "Bittersweet Symphony", artist: "The Verve", bpm: 86, energy: 0.55, mode: "major", reason: "Highs and lows in the same breath — just like today." },
    { title: "Rivers and Roads", artist: "The Head and the Heart", bpm: 82, energy: 0.45, mode: "major", reason: "A little ache and a little hope at once." },
  ],
  low: [
    { title: "Fix You", artist: "Coldplay", bpm: 69, energy: 0.35, mode: "major", reason: "Something gentle for a heavier day, that slowly lifts." },
    { title: "Let It Be", artist: "The Beatles", bpm: 72, energy: 0.35, mode: "major", reason: "A steady hand on the shoulder for a hard day." },
  ],
  stormy: [
    { title: "Breathe Me", artist: "Sia", bpm: 70, energy: 0.3, mode: "minor", reason: "Lets the hard feelings be there without rushing them." },
    { title: "Mad World", artist: "Gary Jules", bpm: 88, energy: 0.2, mode: "minor", reason: "Quiet company for a stormy day." },
  ],
  blank: [{ title: "Weightless", artist: "Marconi Union", bpm: 60, energy: 0.1, mode: "major", reason: "A calm, neutral backdrop while you write." }],
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

async function findTrack(idea: { title: string; artist: string }): Promise<TrackHit | null> {
  try {
    const { tracks } = await searchSongs(`${idea.title} ${idea.artist}`, 5);
    const t = norm(idea.title), a = norm(idea.artist);
    const key = a.replace(/^the /, "").split(" ")[0] ?? "";
    // The artist must match too — a title alone could be a different, unrelated song.
    return tracks.find((x) => norm(x.title).startsWith(t) && key.length > 1 && norm(x.artist).includes(key)) ?? null;
  } catch {
    return null;
  }
}

export async function aiMusic(text: string, wish?: string, avoid: string[] = []): Promise<SongPick> {
  const content = `Diary entry:\n${cleanInput(text, 3000)}`
    + (wish ? `\n\nMusic wish: ${cleanInput(wish, 300)}` : "")
    + (avoid.length ? `\n\nDo not pick any of these again: ${avoid.slice(-6).join("; ")}` : "");
  const out = await complete("felt-music", [{ role: "user", content }]);
  const parsed = parseJson(out);
  const ideas = (Array.isArray(parsed?.songs) ? parsed.songs : [parsed])
    .map((o) => toSong(o && typeof o === "object" ? (o as Record<string, unknown>) : null))
    .filter((x): x is SongIdea => Boolean(x) && [x!.title, x!.artist, x!.reason].every((v) => !v || scrubReply(v, 300) === v.trim()))
    .filter((x) => !avoid.includes(`${x.title} — ${x.artist}`));
  for (const song of ideas.slice(0, 3)) {
    const track = await findTrack(song);
    if (track && !track.explicit) return { ...song, title: track.title, artist: track.artist, track, source: "ai" };
  }
  const mood = countMood(`${text} ${wish ?? ""}`).mood;
  const options = LOCAL_SONGS[mood] ?? LOCAL_SONGS.blank;
  const pick = options.find((o) => !avoid.includes(`${o.title} — ${o.artist}`)) ?? options[0];
  return { ...pick, track: await findTrack(pick), source: "local" };
}

/* ---------- chat ---------- */

export type ChatMsg = { role: "user" | "assistant"; content: string };

/** Streams a Claude reply through Felt's server. Throws AiError (readable message) if the AI is unavailable. */
export async function aiChat(messages: ChatMsg[], context: string | undefined, onText: (soFar: string) => void): Promise<string | null> {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return null;
  if (looksLikeExtraction(last.content)) {
    onText(REFUSAL_SECRET);
    return REFUSAL_SECRET;
  }
  const ctx = context ? cleanInput(context, 3000) : "";
  const history = messages.slice(-20).map((m) => ({ role: m.role, content: cleanInput(m.content, m.role === "user" ? 3000 : 2000) }));
  const reply = await completeStream("felt-chat", [...(ctx ? [{ role: "system" as const, content: ctx }] : []), ...history], (soFar) => onText(scrubReply(soFar, 4000)));
  return reply ? scrubReply(reply, 4000) : null;
}
