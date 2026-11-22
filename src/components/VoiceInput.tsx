"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import s from "./VoiceInput.module.css";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

const LANGS = [
  { code: "en-US", label: "EN" },
  { code: "ru-RU", label: "RU" },
  { code: "kk-KZ", label: "KZ" },
];

const ctor = (): RecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};

/** Speak the day instead of typing it. Appends what was heard to the text. */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const supported = useSyncExternalStore(noop, () => Boolean(ctor()), () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("felt:voice-lang") ?? "en-US"; } catch { return "en-US"; }
  });
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const push = useRef(onText);
  useEffect(() => { push.current = onText; }, [onText]);
  useEffect(() => () => rec.current?.stop(), []);

  if (!supported) return null;

  const start = () => {
    const R = ctor();
    if (!R) return;
    setError(null);
    const r = new R();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) push.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone access was blocked." : e.error === "no-speech" ? "I didn't hear anything — try again." : "Voice typing stopped.");
    r.onend = () => { setListening(false); setInterim(""); };
    rec.current = r;
    r.start();
    setListening(true);
  };

  const pickLang = (code: string) => {
    setLang(code);
    try { localStorage.setItem("felt:voice-lang", code); } catch {}
  };

  return (
    <div className={s.voice}>
      <button type="button" className={s.mic} data-on={listening || undefined} onClick={() => (listening ? rec.current?.stop() : start())} aria-pressed={listening}>
        <span className={s.dot} aria-hidden />
        {listening ? "listening… tap to stop" : "speak your day"}
      </button>
      <div className={s.langs} role="group" aria-label="Voice language">
        {LANGS.map((l) => (
          <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => pickLang(l.code)} disabled={listening}>{l.label}</button>
        ))}
      </div>
      {interim && <p className={s.interim}>{interim}</p>}
      {error && <p className={s.err}>{error}</p>}
    </div>
  );
}
