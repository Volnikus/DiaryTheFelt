"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { countMood } from "@/lib/analysis/mood";
import { NimbusCloud } from "./NimbusCloud";
import s from "./CloudMascot.module.css";

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
  const context = open ? getContext() : undefined;
  const mood = context ? countMood(context) : null;
  const moodLine = mood && mood.hits.length
    ? `today feels ${mood.mood} · +${mood.positive} / −${mood.negative}`
    : "start writing — nimbus will see how today feels";

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

  const say = (content: string) => setMsgs((m) => [...m, { role: "assistant", content }]);
  const hasComposer = () => Boolean((window as unknown as { __feltComposer?: boolean }).__feltComposer);

  // The song the diary form picked after "pick a song" in chat.
  useEffect(() => {
    const onPicked = (e: Event) => {
      const song = (e as CustomEvent<{ title: string; artist: string; reason: string } | null>).detail;
      setBusy(false);
      setMsgs((m) => [...m, { role: "assistant", content: song ? `“${song.title}” — ${song.artist}. ${song.reason} it's in “the song of the day” now.` : "i couldn't pick one yet — write a little more about the day first." }]);
    };
    window.addEventListener("felt:song-picked", onPicked);
    return () => window.removeEventListener("felt:song-picked", onPicked);
  }, []);

  const lastQuoted = () => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role !== "assistant") continue;
      const c = msgs[i].content;
      const m = c.match(/[“"«]([^”"»]{2,80})[”"»]/) ?? c.match(/\*\*([^*]{2,80})\*\*/);
      if (m) return m[1].replace(/^(suggested )?title:\s*/i, "").trim();
    }
    return null;
  };

  const action = (label: string) => {
    if (busy) return;
    if (label === "use this title") {
      const title = lastQuoted();
      setMsgs((m) => [...m, { role: "user", content: label }]);
      if (!title) return say("i haven't suggested a title yet — tap “suggest a title” first.");
      if (!hasComposer()) return say(`open “new day” and i'll put “${title}” into the title field.`);
      window.dispatchEvent(new CustomEvent("felt:use-title", { detail: title }));
      return say(`done — “${title}” is in the title field.`);
    }
    if (label === "pick a song" && hasComposer()) {
      setMsgs((m) => [...m, { role: "user", content: label }]);
      setBusy(true);
      window.dispatchEvent(new CustomEvent("felt:pick-song"));
      return;
    }
    send(undefined, label);
  };

  const send = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const text = (preset ?? draft).trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    if (!preset) setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1).slice(-20), context: getContext()?.slice(0, 4000) || undefined }),
      });
      const json = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: res.ok ? json.reply : res.status === 429 && json.error ? json.error : "my thoughts got foggy — try again?" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "my thoughts got foggy — try again?" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
            <section className={s.panel} role="dialog" aria-label="Chat with Nimbus">
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
                {msgs.map((m, i) => (
                  <motion.div key={i} className={s.msg} data-role={m.role} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                    <p>{m.content}</p>
                    <small>{m.role === "assistant" ? "nimbus" : "you"} · now</small>
                  </motion.div>
                ))}
                {msgs.length === 1 && <p className={s.hint}>i only answer when you ask. tap a suggestion or write anything.</p>}
                {busy && <div className={s.msg} data-role="assistant"><span className={s.dots}><i /><i /><i /></span></div>}
              </div>
              <div className={s.chips}>
                {(msgs.length > 1 ? ["use this title", "pick a song", "another prompt"] : ["suggest a title", "pick a song", "give me a prompt"]).map((q) => (
                  <button key={q} type="button" onClick={() => action(q)}><i />{q}</button>
                ))}
              </div>
              <form className={s.form} onSubmit={send}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)} placeholder="write to nimbus…" maxLength={4000} aria-label="Message" autoFocus />
                <button type="submit" className={s.send} disabled={!draft.trim() || busy}><i />send</button>
              </form>
              <footer className={s.foot}>
                <button type="button" className={s.quiet} role="switch" aria-checked={quiet} onClick={toggleQuiet}><span><i /></span>quiet mode</button>
                <small>answers by ai · kept private</small>
              </footer>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
