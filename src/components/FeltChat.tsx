"use client";

import { useEffect, useRef, useState } from "react";
import { AiError, useAiStatus } from "@/lib/ai/engine";
import { getMascotContext } from "@/lib/client/mascot-context";
import s from "./FeltChat.module.css";

type Msg = { role: "user" | "assistant"; content: string };

/** Felt AI: chat with Claude through Felt's server, streamed token by token. */
export function FeltChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const status = useAiStatus();
  const list = useRef<HTMLDivElement>(null);
  const ready = status.state === "ready";

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    if (status.state === "off") return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    try {
      const { aiChat } = await import("@/lib/ai");
      const reply = await aiChat(next, getMascotContext()?.slice(0, 3000) || undefined, (soFar) =>
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: soFar }]),
      );
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: reply || "Sorry, I couldn't answer that. Try again?" }]);
    } catch (err) {
      const message = err instanceof AiError ? err.message : "Couldn't reach the AI. Check your connection and try again.";
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  };

  // No AI configured on the server: show nothing rather than a chat that can't answer.
  if (status.state !== "ready") return null;

  return (
    <>
      <button type="button" className={s.launcher} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="felt-chat">
        <span className={s.dot} data-on={ready || undefined} aria-hidden />
        {open ? "Close" : "Ask Felt AI"}
      </button>

      {open && (
        <section id="felt-chat" className={s.panel} role="dialog" aria-label="Felt AI chat">
          <header className={s.head}>
            <div>
              <h2 className={s.title}>Felt AI</h2>
              <p className={s.sub}>Messages go through Felt’s server to an AI service only to get a reply. Felt does not save them.</p>
            </div>
            <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>


          <div className={s.list} ref={list}>
            {msgs.length === 0 && (
              <div className={s.empty}>
                <p>Ask anything: help describing your day, a title, a song idea, or a question of your own.</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={s.msg} data-role={m.role}>
                {m.content || <span className={s.typing} aria-label="Thinking"><i /><i /><i /></span>}
              </div>
            ))}
          </div>

          <form className={s.form} onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              maxLength={1500}
              aria-label="Message"
              autoFocus
            />
            <button type="submit" className={s.send} disabled={busy || !draft.trim()}>Send</button>
          </form>
        </section>
      )}
    </>
  );
}
