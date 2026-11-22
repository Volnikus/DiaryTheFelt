"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * Browser side of Felt AI: a thin client for the server endpoint /api/ai/chat/completions
 * (OpenAI-compatible, backed by Claude). Nothing is downloaded or run in the browser, and no key
 * or prompt ever reaches it — the page only picks a preset by name.
 */

export type Preset = "felt-chat" | "felt-title" | "felt-music";
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type AiStatus = { state: "checking" } | { state: "ready" } | { state: "off" };

const ENDPOINT = "/api/ai/chat/completions";

let status: AiStatus = { state: "checking" };
let checking: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function set(next: AiStatus) {
  status = next;
  listeners.forEach((l) => l());
}

/** Asks the server once whether Claude is configured. */
export function checkAi(): Promise<boolean> {
  checking ??= fetch("/api/config")
    .then((r) => r.json())
    .then((cfg: { ai?: boolean }) => {
      set({ state: cfg.ai ? "ready" : "off" });
      return Boolean(cfg.ai);
    })
    .catch(() => {
      checking = null;
      set({ state: "off" });
      return false;
    });
  return checking;
}

export const getAiStatus = () => status;

const CHECKING: AiStatus = { state: "checking" };
export function useAiStatus(): AiStatus {
  const s = useSyncExternalStore((l) => { listeners.add(l); return () => void listeners.delete(l); }, getAiStatus, () => CHECKING);
  useEffect(() => { void checkAi(); }, []);
  return s;
}

export class AiError extends Error {}

async function errorOf(res: Response): Promise<AiError> {
  const json = await res.json().catch(() => null);
  if (res.status === 503) set({ state: "off" });
  return new AiError(json?.error?.message ?? "The AI could not answer. Please try again.");
}

/** One complete reply (no streaming). Returns the text, or null if the AI is unavailable. */
export async function complete(preset: Preset, messages: ChatMessage[], signal?: AbortSignal): Promise<string | null> {
  if (!(await checkAi())) return null;
  try {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: preset, messages }), signal });
    if (!res.ok) throw await errorOf(res);
    const json = await res.json();
    return (json.choices?.[0]?.message?.content as string | undefined)?.trim() || null;
  } catch (err) {
    if (err instanceof AiError) console.warn("[ai]", err.message);
    return null;
  }
}

/** Streams a reply token by token; resolves to the full text. Throws AiError with a readable message. */
export async function completeStream(preset: Preset, messages: ChatMessage[], onText: (soFar: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: preset, messages, stream: true }), signal });
  if (!res.ok || !res.body) throw await errorOf(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 2);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return text;
      const chunk = JSON.parse(data);
      if (chunk.error) throw new AiError(chunk.error.message ?? "The AI stopped unexpectedly.");
      const piece = chunk.choices?.[0]?.delta?.content;
      if (piece) {
        text += piece;
        onText(text);
      }
    }
  }
  return text;
}
