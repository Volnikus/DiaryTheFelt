import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { analyzeTextLocally } from "../analysis/text";
import { countMood } from "../analysis/mood";

// Claude is optional. Without ANTHROPIC_API_KEY every feature falls back to
// Felt's own local algorithms, so the diary keeps working offline.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

async function ask(system: string, messages: Anthropic.MessageParam[], maxTokens = 1024): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort: "low" },
      system,
      messages,
    });
    if (res.stop_reason === "refusal") return null;
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || null;
  } catch (err) {
    console.error("[ai]", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return null;
  }
}

function parseJson<T>(raw: string | null, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const r = schema.safeParse(JSON.parse(m[0]));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/* ---------- title ---------- */

export async function aiTitle(text: string): Promise<{ title: string; source: "ai" | "local" }> {
  const out = await ask(
    "You name diary entries. Reply with ONLY a title: 2–6 words, evocative but plain, no quotes, no emoji, no trailing punctuation. Match the language of the entry.",
    [{ role: "user", content: text.slice(0, 6000) }],
    60,
  );
  const clean = out?.split("\n")[0].replace(/^["'«“]+|["'»”.]+$/g, "").trim();
  if (clean && clean.length <= 80) return { title: clean, source: "ai" };
  return { title: analyzeTextLocally(text).title, source: "local" };
}

/* ---------- music ---------- */

const Song = z.object({
  title: z.string().min(1).max(120),
  artist: z.string().min(1).max(120),
  bpm: z.number().min(40).max(220),
  energy: z.number().min(0).max(1),
  mode: z.enum(["major", "minor"]),
  reason: z.string().max(300),
});
export type SongPick = z.infer<typeof Song> & { url: string; source: "ai" | "local" };

const LOCAL_SONGS: Record<string, z.infer<typeof Song>[]> = {
  radiant: [{ title: "Here Comes the Sun", artist: "The Beatles", bpm: 129, energy: 0.6, mode: "major", reason: "A bright, open day deserves a sunrise of a song." }],
  bright: [{ title: "Lovely Day", artist: "Bill Withers", bpm: 98, energy: 0.5, mode: "major", reason: "Warm and easy, like the good parts of your day." }],
  calm: [{ title: "Gymnopédie No. 1", artist: "Erik Satie", bpm: 66, energy: 0.15, mode: "major", reason: "Quiet and unhurried, to keep the day soft at the edges." }],
  mixed: [{ title: "Bittersweet Symphony", artist: "The Verve", bpm: 86, energy: 0.55, mode: "major", reason: "Highs and lows in the same breath — just like today." }],
  low: [{ title: "Fix You", artist: "Coldplay", bpm: 69, energy: 0.35, mode: "major", reason: "Something gentle for a heavier day, that slowly lifts." }],
  stormy: [{ title: "Breathe Me", artist: "Sia", bpm: 70, energy: 0.3, mode: "minor", reason: "Lets the hard feelings be there without rushing them." }],
  blank: [{ title: "Weightless", artist: "Marconi Union", bpm: 60, energy: 0.1, mode: "major", reason: "A calm, neutral backdrop while you write." }],
};

const songUrl = (s: { title: string; artist: string }) =>
  `https://www.last.fm/music/${encodeURIComponent(s.artist).replace(/%20/g, "+")}/_/${encodeURIComponent(s.title).replace(/%20/g, "+")}`;

export async function aiMusic(text: string, wish?: string): Promise<SongPick> {
  const out = await ask(
    `You pick ONE real, well-known, existing song for a diary entry. Prefer calm, kind choices that fit the mood; suitable for all ages, no explicit lyrics.
Reply with ONLY JSON: {"title":string,"artist":string,"bpm":number,"energy":0..1,"mode":"major"|"minor","reason":"one short friendly sentence"}`,
    [{ role: "user", content: `Diary entry:\n${text.slice(0, 5000)}${wish ? `\n\nWhat the writer wants from the music: ${wish.slice(0, 300)}` : ""}` }],
    300,
  );
  const song = parseJson(out, Song);
  if (song) return { ...song, url: songUrl(song), source: "ai" };
  const pick = LOCAL_SONGS[countMood(text).mood][0];
  return { ...pick, url: songUrl(pick), source: "local" };
}

/* ---------- chat ---------- */

export const ChatIn = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(30),
  context: z.string().max(4000).optional(),
});

export async function aiChat(input: z.infer<typeof ChatIn>): Promise<{ reply: string; source: "ai" | "local" }> {
  const system = `You are Nimbus, a small cloud who lives inside Felt, a gentle diary app. You talk with the writer about their day.
Be warm, calm and brief (1–4 short sentences). Ask at most one question. Never lecture. Suitable for a young writer: kind, safe, no adult themes.
If the writer mentions feeling unsafe, self-harm or a crisis, respond with care and encourage them to talk to a trusted adult or a local helpline right away.
You can help: suggest a title, a song, a writing prompt, or reflect on feelings.${input.context ? `\n\nWhat they are writing right now:\n${input.context}` : ""}`;
  const reply = await ask(system, input.messages, 400);
  if (reply) return { reply, source: "ai" };
  return { reply: localReply(input.messages.at(-1)!.content, input.context), source: "local" };
}

function localReply(msg: string, context?: string): string {
  const m = msg.toLowerCase();
  if (/title|name/.test(m) && context) return `How about “${analyzeTextLocally(context).title}”? Leave the title field empty and I'll use it for you.`;
  if (/song|music/.test(m)) return "Open “The song of the day” and press “Let AI choose” — I'll pick something that fits how today felt.";
  if (/prompt|idea|what.*write|stuck/.test(m)) return "Try this: what was the smallest thing today that made you pause for a second?";
  const mood = countMood(`${msg} ${context ?? ""}`);
  if (mood.mood === "low" || mood.mood === "stormy") return "That sounds like a heavy day. It's okay to write it down just as it was — I'm here, floating nearby.";
  if (mood.mood === "radiant" || mood.mood === "bright") return "I love that. What part of it do you want to remember the most?";
  return "I'm listening. Tell me one more thing about today?";
}
