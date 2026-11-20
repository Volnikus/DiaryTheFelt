import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { analyzeTextLocally } from "../analysis/text";
import { countMood } from "../analysis/mood";
import { cleanInput, fence, looksLikeExtraction, scrubReply } from "./guard";
import { MUSIC_SYSTEM, NIMBUS_SYSTEM, REFUSAL_SECRET, TITLE_SYSTEM } from "./prompts";

// AI is optional. Keys come only from environment variables (Vercel settings or
// a local .env that git ignores) — never from the code.
// XAI_API_KEY → Grok (xAI), ANTHROPIC_API_KEY → Claude. Without either, every
// feature falls back to Felt's own local algorithms.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.20-non-reasoning";
export const aiEnabled = () => Boolean(process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY);

async function askXai(system: string, messages: Anthropic.MessageParam[], maxTokens: number): Promise<string | null> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({
        model: XAI_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" }))],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) { console.error("[ai:xai]", res.status, (await res.text()).slice(0, 200)); return null; }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[ai:xai]", err);
    return null;
  }
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

async function ask(system: string, messages: Anthropic.MessageParam[], maxTokens = 1024): Promise<string | null> {
  if (process.env.XAI_API_KEY) return askXai(system, messages, maxTokens);
  if (!process.env.ANTHROPIC_API_KEY) return null;
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
  const out = await ask(TITLE_SYSTEM, [{ role: "user", content: fence("diary_text", cleanInput(text, 6000)) }], 60);
  const clean = out ? scrubReply(out, 200).split("\n")[0].replace(/^["'«“]+|["'»”.]+$/g, "").trim() : null;
  if (clean && clean !== REFUSAL_SECRET && clean.length <= 80 && clean.split(/\s+/).length <= 8) return { title: clean, source: "ai" };
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
  const content = fence("diary_text", cleanInput(text, 5000)) + (wish ? `\n\n${fence("music_wish", cleanInput(wish, 300))}` : "");
  const out = await ask(MUSIC_SYSTEM, [{ role: "user", content }], 300);
  const song = parseJson(out, Song);
  if (song && [song.title, song.artist, song.reason].every((v) => scrubReply(v, 300) === v.trim())) return { ...song, url: songUrl(song), source: "ai" };
  const pick = LOCAL_SONGS[countMood(text).mood][0];
  return { ...pick, url: songUrl(pick), source: "local" };
}

/* ---------- chat ---------- */

export const ChatIn = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(30)
    .refine((m) => m.at(-1)?.role === "user", "The last message must come from you")
    .refine((m) => m.reduce((n, x) => n + x.content.length, 0) <= 16000, "The conversation is too long — start a new one"),
  context: z.string().max(4000).optional(),
});

export async function aiChat(input: z.infer<typeof ChatIn>): Promise<{ reply: string; source: "ai" | "local" }> {
  const last = input.messages.at(-1)!;
  // Obvious attempts to pull out instructions, code or keys never reach the model.
  if (last.role === "user" && looksLikeExtraction(last.content)) return { reply: REFUSAL_SECRET, source: "local" };

  const context = input.context ? cleanInput(input.context, 4000) : "";
  const system = context ? `${NIMBUS_SYSTEM}\n\n${fence("diary_text", context)}` : NIMBUS_SYSTEM;
  const messages = input.messages.map((m) => ({ role: m.role, content: cleanInput(m.content, m.role === "user" ? 1500 : 800) }));
  const reply = await ask(system, messages, 400);
  if (reply) return { reply: scrubReply(reply), source: "ai" };
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
