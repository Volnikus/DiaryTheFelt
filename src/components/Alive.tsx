"use client";

import { useEffect, useState } from "react";
import s from "./Alive.module.css";

export function Typewriter({ text, speed = 38 }: { text: string; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setN(text.length), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i = i >= text.length + 40 ? 0 : i + 1;
      setN(Math.min(i, text.length));
      t = setTimeout(tick, i > text.length ? 60 : speed + Math.random() * 40);
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [text, speed]);
  return (
    <p className={s.type}>
      {text.slice(0, n)}
      <span className={s.caret} aria-hidden />
    </p>
  );
}

export function Equalizer({ bpm, bars = 28 }: { bpm: number; bars?: number }) {
  const beat = 60 / bpm;
  return (
    <div className={s.eq} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} style={{ animationDuration: `${beat * (1 + (i % 3) * 0.5)}s`, animationDelay: `${-((i * 0.137) % 1) * beat}s`, height: `${30 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}
