"use client";

import { AnimatePresence, MotionConfig, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { countMood } from "@/lib/analysis/mood";
import { AiError, useAiStatus } from "@/lib/ai/engine";
import { getMascotContext } from "@/lib/client/mascot-context";
import { NimbusCloud } from "./NimbusCloud";
import s from "./FeltChat.module.css";

// Cloud puffs around the chat panel walls: random sizes, seeded so they stay put.
const PUFFS = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: { x: number; y: number; r: number }[] = [];
  for (let d = rnd() * 4; d < 400; d += 7 + rnd() * 6) {
    const side = Math.floor(d / 100), t = d % 100;
    const [x, y] = side === 0 ? [t, 0] : side === 1 ? [100, t] : side === 2 ? [100 - t, 100] : [0, 100 - t];
    out.push({ x: x + (rnd() - 0.5) * 4, y: y + (rnd() - 0.5) * 4, r: 50 + rnd() * 45 });
  }
  return out;
})();

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

const GREETING = "hi, i'm nimbus. how did today feel?";
const FOGGY = "my thoughts got foggy — try again?";

type Msg = { role: "user" | "assistant"; content: string };

/** Nimbus: a soft cloud that drifts in the corner and opens a chat ringed by cloud puffs. */
export function FeltChat() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(() => {
    try { return localStorage.getItem("felt:nimbus-quiet") === "1"; } catch { return false; }
  });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const status = useAiStatus();
  const controls = useAnimationControls();
  const list = useRef<HTMLDivElement>(null);

  const context = open ? getMascotContext() : undefined;
  const mood = context ? countMood(context) : null;
  const moodLine = mood && mood.hits.length
    ? `today feels ${mood.mood} · +${mood.positive} / −${mood.negative}`
    : "start writing — nimbus will see how today feels";

  // Drift slowly to a new spot along the bottom-right edges every ~14s.
  // Only once the cloud is on screen: before that, start() resolves at once and the loop would spin.
  const ready = status.state === "ready";
  useEffect(() => {
    if (open || !ready) return;
    let alive = true;
    const drift = async () => {
      while (alive) {
        const x = -(Math.random() * Math.min(260, window.innerWidth * 0.5));
        const y = -(Math.random() * Math.min(220, window.innerHeight * 0.35));
        const started = performance.now();
        await controls.start({ x, y, transition: { duration: 12 + Math.random() * 6, ease: "easeInOut" } });
        if (performance.now() - started < 1000) await new Promise((r) => setTimeout(r, 4000));
      }
    };
    void drift();
    return () => { alive = false; controls.stop(); };
  }, [open, ready, controls]);

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

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleQuiet = () => {
    const next = !quiet;
    setQuiet(next);
    setBubble(null);
    try { localStorage.setItem("felt:nimbus-quiet", next ? "1" : "0"); } catch {}
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || status.state !== "ready") return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    try {
      const { aiChat } = await import("@/lib/ai");
      const reply = await aiChat(next.slice(-20), getMascotContext()?.slice(0, 3000) || undefined, (soFar) =>
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: soFar }]),
      );
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: reply || FOGGY }]);
    } catch (err) {
      const message = err instanceof AiError ? err.message : FOGGY;
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  };

  // No AI configured on the server: show nothing rather than a chat that can't answer.
  if (status.state !== "ready") return null;

  const shown: Msg[] = [{ role: "assistant", content: GREETING }, ...msgs];
  const chips = msgs.length ? ["another title", "a different song", "another prompt"] : ["suggest a title", "pick a song", "give me a prompt"];

  return (
    <MotionConfig reducedMotion="user">
      {/* soft glow along the screen edges while Nimbus is listening */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="aura"
            className={s.aura}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

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
          aria-controls="felt-chat"
          aria-label={open ? "Close chat with Nimbus" : "Talk to Nimbus, the diary cloud"}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <NimbusCloud width={92} />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className={s.wrap}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={s.puffs} aria-hidden>
              {PUFFS.map((p, i) => (
                <motion.i
                  key={i}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.r, height: p.r }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ scale: { duration: 4 + (i % 5), repeat: Infinity, ease: "easeInOut", delay: i * 0.05 } }}
                />
              ))}
            </div>
            <section id="felt-chat" className={s.panel} role="dialog" aria-label="Chat with Nimbus">
              <header className={s.head}>
                <span className={s.avatar}><NimbusCloud width={46} shadow={false} /></span>
                <div className={s.title}>
                  <p>nimbus</p>
                  <span><i />{context ? "listening · reads what you write" : "floating nearby"}</span>
                </div>
                <button type="button" className={s.esc} onClick={() => setOpen(false)} aria-label="Close chat">esc</button>
              </header>
              <p className={s.context}>{moodLine}</p>
              <div className={s.list} ref={list}>
                {shown.map((m, i) => (
                  <motion.div key={i} className={s.msg} data-role={m.role} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                    {m.content
                      ? <><p>{m.content}</p><small>{m.role === "assistant" ? "nimbus" : "you"} · now</small></>
                      : <span className={s.dots} aria-label="Nimbus is thinking"><i /><i /><i /></span>}
                  </motion.div>
                ))}
                {msgs.length === 0 && <p className={s.hint}>i only answer when you ask. tap a suggestion or write anything.</p>}
              </div>
              <div className={s.chips}>
                {chips.map((q) => (
                  <button key={q} type="button" disabled={busy} onClick={() => void send(q)}><i />{q}</button>
                ))}
              </div>
              <form className={s.form} onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="write to nimbus…" maxLength={1500} aria-label="Message" autoFocus />
                <button type="submit" className={s.send} disabled={!draft.trim() || busy}><i />send</button>
              </form>
              <footer className={s.foot}>
                <button type="button" className={s.quiet} role="switch" aria-checked={quiet} onClick={toggleQuiet}><span><i /></span>quiet mode</button>
                <small>answers by ai · not saved</small>
              </footer>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
