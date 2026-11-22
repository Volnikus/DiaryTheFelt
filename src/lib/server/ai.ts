import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM, MEMORY_SYSTEM, MUSIC_SYSTEM, TITLE_SYSTEM } from "../ai/prompts";
import { cleanInput, fence, scrubReply } from "../ai/guard";

/*
 * Felt's AI backend: one request goes to the first provider that can answer it.
 *
 * Free tiers have small per-model quotas (requests/minute, tokens/minute, requests/day), and a single
 * model can run out during a busy demo. Each provider below has its own separate quota, so they are
 * tried in order; one that hits its limit is skipped until it resets (Retry-After), and the request
 * moves straight to the next. Keys come only from environment variables and never reach the browser.
 *
 * Order: xAI Grok (paid; only when FELT_PAID_AI=on and XAI_API_KEY is set) → Claude (only if
 *        ANTHROPIC_API_KEY is set) → Groq gpt-oss-120b → Gemini Flash-Lite → Groq gpt-oss-20b →
 *        Mistral (only if MISTRAL_API_KEY is set). The free providers stay as backups behind the paid one.
 */

export type PresetName = "felt-chat" | "felt-title" | "felt-music" | "felt-memory";
export type Turn = { role: "user" | "assistant"; content: string };

/** System prompt and output limit per preset (limits include any reasoning tokens). Kept small: fewer tokens = more requests per minute on free tiers. */
export const PRESETS: Record<PresetName, { system: string; maxTokens: number; contextAllowed: boolean }> = {
  "felt-chat": { system: process.env.FELT_CHAT_SYSTEM_PROMPT?.trim() || CHAT_SYSTEM, maxTokens: 800, contextAllowed: true },
  "felt-title": { system: TITLE_SYSTEM, maxTokens: 300, contextAllowed: false },
  "felt-music": { system: MUSIC_SYSTEM, maxTokens: 1000, contextAllowed: false },
  "felt-memory": { system: MEMORY_SYSTEM, maxTokens: 500, contextAllowed: false },
};

interface Provider {
  id: string;
  kind: "claude" | "openai";
  model: string;
  url?: string;
  key: string;
  extra?: Record<string, unknown>;
}

const env = (name: string) => process.env[name]?.trim() || "";

export function providers(): Provider[] {
  const list: Provider[] = [];
  // Paid Grok is switched on deliberately (FELT_PAID_AI=on), so the credit is spent only when wanted, e.g. for judging.
  if (env("XAI_API_KEY") && env("FELT_PAID_AI") === "on") {
    list.push({ id: "xai", kind: "openai", model: env("XAI_MODEL") || "grok-4.3", key: env("XAI_API_KEY"), url: "https://api.x.ai/v1/chat/completions" });
  }
  if (env("ANTHROPIC_API_KEY")) list.push({ id: "claude", kind: "claude", model: env("CLAUDE_MODEL") || "claude-opus-5-5", key: env("ANTHROPIC_API_KEY") });

  const groqKey = env("GROQ_API_KEY");
  const groqModels = (env("GROQ_MODELS") || "openai/gpt-oss-120b,openai/gpt-oss-20b").split(",").map((m) => m.trim()).filter(Boolean);
  const groq = (model: string): Provider => ({
    id: `groq:${model}`, kind: "openai", model, key: groqKey,
    url: "https://api.groq.com/openai/v1/chat/completions",
    // gpt-oss models think before answering; keep that short so answers come fast and use fewer tokens.
    extra: model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined,
  });
  if (groqKey && groqModels[0]) list.push(groq(groqModels[0]));

  if (env("GEMINI_API_KEY")) {
    list.push({
      id: "gemini", kind: "openai", model: env("GEMINI_MODEL") || "gemini-flash-lite-latest", key: env("GEMINI_API_KEY"),
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    });
  }
  if (groqKey) for (const m of groqModels.slice(1)) list.push(groq(m));

  if (env("MISTRAL_API_KEY")) {
    list.push({ id: "mistral", kind: "openai", model: env("MISTRAL_MODEL") || "mistral-small-latest", key: env("MISTRAL_API_KEY"), url: "https://api.mistral.ai/v1/chat/completions" });
  }
  return list;
}

export const aiEnabled = () => providers().length > 0;

/* ---------- cooldowns: a provider that ran out of quota is skipped until it resets ---------- */

const coolUntil = new Map<string, number>();
const cooling = (id: string) => (coolUntil.get(id) ?? 0) > Date.now();
function coolDown(id: string, ms: number) {
  coolUntil.set(id, Date.now() + Math.min(Math.max(ms, 5_000), 60 * 60 * 1000));
}

export class ProviderError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs: number | null = null) {
    super(message);
  }
}
export class AllBusyError extends Error {}

function retryAfter(res: Response): number | null {
  const ra = res.headers.get("retry-after");
  if (!ra) return null;
  const secs = Number(ra);
  if (Number.isFinite(secs)) return secs * 1000;
  const at = Date.parse(ra);
  return Number.isFinite(at) ? at - Date.now() : null;
}

/* ---------- one call to an OpenAI-compatible provider (Groq, Gemini, Mistral) ---------- */

async function callOpenAI(p: Provider, system: string, turns: Turn[], maxTokens: number, onText: ((delta: string) => void) | null, signal: AbortSignal) {
  const res = await fetch(p.url!, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
    body: JSON.stringify({ model: p.model, messages: [{ role: "system", content: system }, ...turns], max_tokens: maxTokens, stream: Boolean(onText), ...p.extra }),
    signal,
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new ProviderError(`${p.id} ${res.status}: ${detail}`, res.status, retryAfter(res));
  }

  if (!onText) {
    const json = await res.json();
    const choice = json.choices?.[0];
    return {
      text: (choice?.message?.content as string | undefined) ?? "",
      finish: (choice?.finish_reason as string | undefined) ?? "stop",
      inputTokens: json.usage?.prompt_tokens ?? null,
      outputTokens: json.usage?.completion_tokens ?? null,
    };
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "", finish = "stop";
  let inputTokens: number | null = null, outputTokens: number | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let chunk: { choices?: { delta?: { content?: string }; finish_reason?: string | null }[]; usage?: { prompt_tokens?: number; completion_tokens?: number }; x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number } } };
      try { chunk = JSON.parse(data); } catch { continue; }
      const piece = chunk.choices?.[0]?.delta?.content;
      if (piece) { text += piece; onText(piece); }
      if (chunk.choices?.[0]?.finish_reason) finish = chunk.choices[0].finish_reason!;
      const usage = chunk.usage ?? chunk.x_groq?.usage;
      if (usage) { inputTokens = usage.prompt_tokens ?? inputTokens; outputTokens = usage.completion_tokens ?? outputTokens; }
    }
  }
  return { text, finish, inputTokens, outputTokens };
}

/* ---------- one call to Claude (official SDK), used first when ANTHROPIC_API_KEY is set ---------- */

const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5-2"]);
let anthropic: Anthropic | null = null;

const MUSIC_SCHEMA = {
  type: "object", additionalProperties: false, required: ["songs"],
  properties: {
    songs: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["title", "artist", "bpm", "energy", "mode", "reason"],
        properties: { title: { type: "string" }, artist: { type: "string" }, bpm: { type: "number" }, energy: { type: "number" }, mode: { type: "string", enum: ["major", "minor"] }, reason: { type: "string" } },
      },
    },
  },
} as const;

async function callClaude(p: Provider, preset: PresetName, system: string, turns: Turn[], maxTokens: number, onText: ((delta: string) => void) | null, signal: AbortSignal) {
  anthropic ??= new Anthropic({ apiKey: p.key, maxRetries: 0, timeout: 45_000 });
  const params = {
    model: p.model,
    max_tokens: Math.max(maxTokens, 2000),
    system,
    messages: turns,
    output_config: {
      effort: "low" as const,
      ...(preset === "felt-music" ? { format: { type: "json_schema" as const, schema: MUSIC_SCHEMA } } : {}),
    },
    ...(FALLBACK_MODELS.has(p.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  } satisfies Anthropic.Beta.MessageCreateParamsNonStreaming;
  try {
    let message: Anthropic.Beta.BetaMessage;
    if (onText) {
      const stream = anthropic.beta.messages.stream(params, { signal });
      stream.on("text", (delta) => onText(delta));
      message = await stream.finalMessage();
    } else {
      message = await anthropic.beta.messages.create(params, { signal });
    }
    const text = message.stop_reason === "refusal" ? "" : message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return { text, finish: message.stop_reason ?? "end_turn", inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new ProviderError(`claude ${err.status}: ${err.message.slice(0, 160)}`, err.status ?? 500, null);
    throw err;
  }
}

/* ---------- the failover chain ---------- */

export interface Generated { text: string; finish: string; provider: string; inputTokens: number | null; outputTokens: number | null }

/**
 * Runs a preset on the first available provider. With `onText`, the reply streams; a provider that
 * fails before sending any text is replaced by the next one, so the visitor never notices.
 */
export async function generate(preset: PresetName, turns: Turn[], context: string | null, onText: ((delta: string) => void) | null, signal: AbortSignal): Promise<Generated> {
  const p = PRESETS[preset];
  const system = context && p.contextAllowed ? `${p.system}\n\nToday's diary text so far (context only):\n${fence("diary_text", cleanInput(context, 1500))}` : p.system;
  const list = providers();
  if (!list.length) throw new AllBusyError("AI is not configured on this server.");

  const available = list.filter((x) => !cooling(x.id));
  // If every provider is cooling down, still try the one that resets soonest rather than failing outright.
  const order = available.length ? available : [...list].sort((a, b) => (coolUntil.get(a.id) ?? 0) - (coolUntil.get(b.id) ?? 0)).slice(0, 1);

  for (const provider of order) {
    let streamed = false;
    const forward = onText ? (delta: string) => { streamed = true; onText(delta); } : null;
    const started = Date.now();
    const timeout = AbortSignal.timeout(onText ? 45_000 : 25_000);
    try {
      const r = provider.kind === "claude"
        ? await callClaude(provider, preset, system, turns, p.maxTokens, forward, AbortSignal.any([signal, timeout]))
        : await callOpenAI(provider, system, turns, p.maxTokens, forward, AbortSignal.any([signal, timeout]));
      if (!r.text.trim()) throw new ProviderError(`${provider.id}: empty reply`, 502);
      console.info(JSON.stringify({ event: "ai_usage", preset, provider: provider.id, input_tokens: r.inputTokens, output_tokens: r.outputTokens, finish: r.finish, ms: Date.now() - started }));
      return { ...r, provider: provider.id };
    } catch (err) {
      if (signal.aborted) throw err;
      const status = err instanceof ProviderError ? err.status : 0;
      const wait = err instanceof ProviderError && err.retryAfterMs != null ? err.retryAfterMs
        : status === 429 ? 60_000
        : status === 401 || status === 403 || status === 404 ? 10 * 60_000 // bad key or unknown model: stop hammering it
        : 20_000;                                                           // timeouts, 5xx, overload
      coolDown(provider.id, wait);
      console.warn(JSON.stringify({ event: "ai_failover", preset, provider: provider.id, status, cool_ms: wait, error: err instanceof Error ? err.message.slice(0, 200) : String(err) }));
      if (streamed) throw err; // part of an answer was already shown; don't splice in another model
    }
  }
  throw new AllBusyError("All AI providers are busy right now.");
}

/**
 * Title and atmosphere line for a new memory, in one AI call (saves quota). Each field is null when the
 * AI is off, fails or returns something unusable, so Felt's own title and line are kept.
 */
export async function aiMemoryWords(text: string): Promise<{ title: string | null; line: string | null }> {
  const none = { title: null, line: null };
  if (!aiEnabled()) return none;
  try {
    const r = await generate("felt-memory", [{ role: "user", content: fence("diary_text", cleanInput(text, 3000)) }], null, null, AbortSignal.timeout(20_000));
    const json = JSON.parse(r.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { title?: unknown; line?: unknown };
    const clean = (v: unknown, max: number) => (typeof v === "string" ? scrubReply(v, max).replace(/["«»“”*#]/g, "").trim() : "");
    const words = clean(json.title, 120).replace(/[.!,;:]+$/, "").split(/\s+/).filter(Boolean);
    const line = clean(json.line, 240);
    return {
      title: words.length >= 3 && words.length <= 9 ? words.slice(0, 7).join(" ") : null,
      line: line && line.split(/\s+/).length <= 30 ? line : null,
    };
  } catch {
    return none;
  }
}
