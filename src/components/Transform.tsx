"use client";

import { useEffect, useState } from "react";
import type { Entry } from "@/lib/types";
import { designVars, titleStyle } from "@/lib/theme";
import { GenerativeField } from "./GenerativeField";
import { Photo } from "./Photo";
import { Waveform } from "./Waveform";
import s from "./Transform.module.css";
import Link from "next/link";

export function Transform({ entries }: { entries: Entry[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || entries.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % entries.length), 7600);
    return () => clearInterval(t);
  }, [paused, entries.length]);

  if (!entries.length) return <div className={`${s.shell} skeleton`} />;
  const e = entries[i];
  const d = e.design;
  const excerpt = e.text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");

  return (
    <div
      className={s.shell}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={(ev) => { setPaused(false); ev.currentTarget.style.setProperty("--rx", "0deg"); ev.currentTarget.style.setProperty("--ry", "0deg"); }}
      onPointerMove={(ev) => {
        const r = ev.currentTarget.getBoundingClientRect();
        ev.currentTarget.style.setProperty("--ry", `${((ev.clientX - r.left) / r.width - 0.5) * 10}deg`);
        ev.currentTarget.style.setProperty("--rx", `${-((ev.clientY - r.top) / r.height - 0.5) * 8}deg`);
      }}
    >
      <div key={e.id} className={s.scene}>
        <div className={s.inputs}>
          <div className={`glass ${s.input} ${s.note}`}>
            <span className="meta">Words</span>
            <p>{excerpt}</p>
          </div>
          <div className={`glass ${s.input} ${s.prints}`}>
            {e.photos.slice(0, 3).map((p, k) => (
              <Photo key={p.media.key} src={p.media.url} alt="" width={p.width} height={p.height} sizes="120px" style={{ "--k": k } as React.CSSProperties} />
            ))}
            <span className="meta">Photographs · {e.photos.length}</span>
          </div>
          <div className={`glass ${s.input} ${s.song}`}>
            <span className={s.beat} style={{ animationDuration: `${d.motion.beatMs}ms` }} />
            <div>
              <span className="meta">Music · {e.musicProfile.bpm} bpm · {e.musicProfile.key ?? e.musicProfile.mode}</span>
              <Waveform envelope={e.musicProfile.envelope} color="var(--safelight)" height={22} />
            </div>
          </div>
        </div>

        <div className={s.arrow} aria-hidden>
          <span />
        </div>

        <Link href={`/m/${e.id}`} className={s.output} style={designVars(d)} aria-label={`Open the memory “${e.title}”`}>
          <div className={s.outField}><GenerativeField design={d} intensity={0.7} /></div>
          <Photo src={e.photos[0].media.url} alt="" width={e.photos[0].width} height={e.photos[0].height} sizes="(max-width: 860px) 90vw, 480px" className={`${s.outPhoto} ${s[d.treatment]}`} priority />
          <div className={s.outText}>
            <h3 style={titleStyle(d, d.type.family === "serif" ? "clamp(1.9rem, 3.6vw, 3.2rem)" : "clamp(1.5rem, 2.6vw, 2.4rem)")}>{e.title}</h3>
            <p>{e.analysis.atmosphere}</p>
          </div>
          <div className={s.outSwatches}>{[d.palette.accent, d.palette.accent2, d.palette.glow, ...d.palette.swatches.slice(0, 3)].map((c, k) => <i key={k} style={{ background: c }} />)}</div>
        </Link>
      </div>

      <div className={s.tabs} role="tablist" aria-label="Demonstration days">
        {entries.map((x, k) => (
          <button key={x.id} role="tab" aria-selected={k === i} onClick={() => { setI(k); setPaused(true); }}>
            <span className={s.tabNo}>0{k + 1}</span> {x.title}
          </button>
        ))}
      </div>
    </div>
  );
}
