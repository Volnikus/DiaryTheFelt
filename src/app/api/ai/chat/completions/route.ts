import { z } from "zod/v4";
import { looksLikeExtraction, scrubReply } from "@/lib/ai/guard";
import { REFUSAL_SECRET } from "@/lib/ai/prompts";
import { AllBusyError, aiEnabled, generate, PRESETS, type PresetName, type Turn } from "@/lib/server/ai";
import { rateLimited } from "@/lib/server/ratelimit";

/*
 * POST /api/ai/chat/completions — OpenAI-compatible request and response shapes.
 *
 *   { "model": "felt-chat" | "felt-title" | "felt-music", "messages": [...], "stream": true }
 *
 * `model` names a server-side preset (prompt and limits live on the server). The server picks the
 * actual AI provider from its failover chain (see lib/server/ai.ts). A `system` message from the
 * browser is treated as diary context for felt-chat only. Streaming uses OpenAI-style SSE + `[DONE]`.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const Message = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(6000),
});
const Body = z.object({
  model: z.enum(Object.keys(PRESETS) as [PresetName, ...PresetName[]]).default("felt-chat"),
  messages: z.array(Message).min(1).max(40),
  stream: z.boolean().default(false),
});

// Per visitor, per 10 minutes. Stops one person from using up the shared free quotas.
const LIMITS: Record<PresetName, number> = { "felt-chat": 30, "felt-title": 20, "felt-music": 20, "felt-memory": 20 };
const BUSY = "The AI is very busy right now. Please try again in a minute.";
const DECLINED = "Sorry, I can't help with that one.";

function apiError(status: number, message: string, type: string) {
  return Response.json({ error: { message, type } }, { status, headers: { "cache-control": "no-store" } });
}

const usageOf = (input: number | null, output: number | null) =>
  input != null && output != null ? { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } : undefined;

const finishOf = (f: string) => (f === "length" || f === "max_tokens" ? "length" : f === "refusal" || f === "content_filter" ? "content_filter" : "stop");

export async function POST(request: Request) {
  if (!aiEnabled()) return apiError(503, "AI is not configured on this server.", "ai_disabled");

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (err) {
    return apiError(400, err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON", "invalid_request_error");
  }
  if (rateLimited(request, `ai:${body.model}`, LIMITS[body.model], 10 * 60 * 1000)) {
    return apiError(429, "You've sent a lot of requests. Please wait a few minutes.", "rate_limit_error");
  }

  // Diary context arrives as system messages; keep only recent turns (fewer tokens = more headroom on free tiers).
  const context = body.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || null;
  const turns = body.messages.filter((m) => m.role !== "system").slice(-10) as Turn[];
  while (turns[0]?.role === "assistant") turns.shift();
  const last = turns.at(-1);
  if (!last || last.role !== "user") return apiError(400, "The last message must come from the user.", "invalid_request_error");

  const id = `chatcmpl-${crypto.randomUUID()}`;
  const preset = body.model;
  const created = Math.floor(Date.now() / 1000);
  const chunk = (delta: Record<string, string>, finish: string | null, extra?: object) => ({ id, object: "chat.completion.chunk", created, model: preset, choices: [{ index: 0, delta, finish_reason: finish }], ...extra });

  // Obvious attempts to extract instructions or keys never reach a model.
  if (looksLikeExtraction(last.content)) {
    if (!body.stream) return Response.json({ id, object: "chat.completion", created, model: preset, choices: [{ index: 0, message: { role: "assistant", content: REFUSAL_SECRET }, finish_reason: "stop" }] });
    return sse((send) => { send(chunk({ role: "assistant", content: REFUSAL_SECRET }, null)); send(chunk({}, "stop")); });
  }

  if (!body.stream) {
    try {
      const r = await generate(preset, turns, context, null, request.signal);
      const text = scrubReply(r.text, 4000) || DECLINED;
      return Response.json(
        { id, object: "chat.completion", created, model: preset, choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: finishOf(r.finish) }], usage: usageOf(r.inputTokens, r.outputTokens) },
        { headers: { "cache-control": "no-store", "x-ai-provider": r.provider } },
      );
    } catch (err) {
      if (err instanceof AllBusyError) return apiError(503, BUSY, "overloaded");
      console.error("[ai] request failed:", err);
      return apiError(502, "The AI had a problem. Please try again.", "api_error");
    }
  }

  return sse(async (send) => {
    let first = true;
    try {
      const r = await generate(preset, turns, context, (delta) => {
        send(chunk(first ? { role: "assistant", content: delta } : { content: delta }, null));
        first = false;
      }, request.signal);
      send(chunk({}, finishOf(r.finish), { usage: usageOf(r.inputTokens, r.outputTokens) }));
    } catch (err) {
      if (request.signal.aborted) return;
      if (!(err instanceof AllBusyError)) console.error("[ai] stream failed:", err);
      send({ error: { message: err instanceof AllBusyError ? BUSY : "The AI stopped unexpectedly. Please try again.", type: err instanceof AllBusyError ? "overloaded" : "api_error" } });
    }
  });
}

/** Server-sent events in the OpenAI style: `data: {json}` lines, then `data: [DONE]`. */
function sse(run: (send: (data: unknown) => void) => void | Promise<void>) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        await run(send);
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" },
  });
}
