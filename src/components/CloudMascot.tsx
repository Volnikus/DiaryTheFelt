"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import s from "./CloudMascot.module.css";

const PHRASES = [
  "take your time.",
  "small days count too.",
  "breathe in… and out.",
  "what colour was today?",
  "no rush. i'm just floating.",
  "one sentence is enough.",
  "the light changes, so do we.",
  "drink some water?",
  "tap me if you want to talk.",
];

type Msg = { role: "user" | "assistant"; content: string };

/** Share what the user is writing with the mascot (Composer calls this). */
export function setMascotContext(text: string) {
  if (typeof window !== "undefined") (window as unknown as { __feltContext?: string }).__feltContext = text;
}
const getContext = () => (typeof window !== "undefined" ? (window as unknown as { __feltContext?: string }).__feltContext : undefined);

export function CloudMascot() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("felt:nimbus-quiet") === "1"; } catch { return false; }
  });
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "hi, i'm nimbus. how did today feel?" }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const controls = useAnimationControls();
  const list = useRef<HTMLDivElement>(null);

  // Drift slowly to a new spot along the edges every ~14s.
  useEffect(() => {
    if (open) return;
    let alive = true;
    const drift = async () => {
      while (alive) {
        const x = -(Math.random() * Math.min(260, window.innerWidth * 0.5));
        const y = -(Math.random() * Math.min(220, window.innerHeight * 0.35));
        await controls.start({ x, y, transition: { duration: 12 + Math.random() * 6, ease: "easeInOut" } });
      }
    };
    drift();
    return () => { alive = false; controls.stop(); };
  }, [open, controls]);

  // A calm phrase roughly once a minute, shown for 6 seconds.
  useEffect(() => {
    if (quiet || open) return;
    let i = Math.floor(Math.random() * PHRASES.length);
    const first = setTimeout(() => setBubble(PHRASES[i]), 8000);
    const every = setInterval(() => { i = (i + 1) % PHRASES.length; setBubble(PHRASES[i]); }, 60000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [quiet, open]);
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 6000);
    return () => clearTimeout(t);
  }, [bubble]);

  useEffect(() => { list.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [msgs, busy]);

  const toggleQuiet = () => {
    const next = !quiet;
    setQuiet(next);
    setBubble(null);
    try { localStorage.setItem("felt:nimbus-quiet", next ? "1" : "0"); } catch {}
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1).slice(-20), context: getContext()?.slice(0, 4000) || undefined }),
      });
      const json = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: res.ok ? json.reply : "my thoughts got foggy — try again?" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "my thoughts got foggy — try again?" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div className={s.float} animate={open ? { x: 0, y: 0 } : controls}>
        <AnimatePresence>
          {bubble && !open && (
            <motion.p className={s.bubble} initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.5 }}>
              {bubble}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          className={s.cloud}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close chat with Nimbus" : "Talk to Nimbus, the diary cloud"}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg viewBox="0 0 120 80" aria-hidden>
            <path d="M30 70 C12 70 6 56 12 46 C6 32 22 20 36 26 C40 10 66 6 74 22 C88 14 106 24 102 40 C116 46 112 70 94 70 Z" fill="#FFFFFF" stroke="#11110F" strokeWidth="3" />
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 5, repeat: Infinity, times: [0, 0.92, 0.95, 1] }} style={{ originY: "46px" }}>
              <rect x="44" y="40" width="6" height="10" rx="2" fill="#11110F" />
              <rect x="70" y="40" width="6" height="10" rx="2" fill="#11110F" />
            </motion.g>
            <path d="M54 56 Q60 61 66 56" fill="none" stroke="#11110F" strokeWidth="3" strokeLinecap="round" />
            <rect x="36" y="52" width="8" height="5" rx="2.5" fill="#FFD83D" />
            <rect x="76" y="52" width="8" height="5" rx="2.5" fill="#FFD83D" />
          </svg>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.section
            className={s.panel}
            role="dialog"
            aria-label="Chat with Nimbus"
            initial={{ opacity: 0, y: 40, scale: 0.92, clipPath: "inset(100% 0 0 0 round 4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0 0 0 round 4px)" }}
            exit={{ opacity: 0, y: 30, scale: 0.95, clipPath: "inset(100% 0 0 0 round 4px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className={s.head}>
              <p><i /> nimbus</p>
              <span>chat</span>
            </header>
            <div className={s.list} ref={list}>
              {msgs.map((m, i) => (
                <motion.p key={i} className={s.msg} data-role={m.role} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                  {m.content}
                </motion.p>
              ))}
              {busy && <p className={s.msg} data-role="assistant"><span className={s.dots}><i /><i /><i /></span></p>}
            </div>
            <div className={s.chips}>
              {["suggest a title", "pick a song", "give me a prompt"].map((q) => (
                <button key={q} type="button" onClick={() => setDraft(q)}>{q}</button>
              ))}
            </div>
            <form className={s.form} onSubmit={send}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="write to nimbus…" maxLength={4000} aria-label="Message" autoFocus />
              <button type="submit" className={s.send} disabled={!draft.trim() || busy}>send</button>
            </form>
            <button type="button" className={s.quiet} onClick={toggleQuiet}>{quiet ? "let nimbus speak again" : "keep nimbus quiet"}</button>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
