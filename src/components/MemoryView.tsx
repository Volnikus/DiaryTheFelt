"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Entry } from "@/lib/types";
import { mulberry32 } from "@/lib/engine/random";
import { designVars, formatDay, titleStyle, TREATMENT_LABEL } from "@/lib/theme";
import { PROVIDER_LABEL } from "@/lib/music-link";
import { GenerativeField } from "./GenerativeField";
import { Photo } from "./Photo";
import { Waveform } from "./Waveform";
import { Explain } from "./Explain";
import s from "./Memory.module.css";

type Analyser = { ctx: AudioContext; node: AnalyserNode; buf: Uint8Array<ArrayBuffer> };
const analysers = new WeakMap<HTMLMediaElement, Analyser>();

function analyserFor(el: HTMLMediaElement): Analyser | null {
  let a = analysers.get(el);
  if (!a) {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(el);
      const node = ctx.createAnalyser();
      node.fftSize = 1024;
      src.connect(node);
      node.connect(ctx.destination);
      a = { ctx, node, buf: new Uint8Array(new ArrayBuffer(node.fftSize)) };
      analysers.set(el, a);
    } catch {
      return null;
    }
  }
  return a;
}

function seekElement(el: HTMLMediaElement, fraction: number) {
  if (Number.isFinite(el.duration)) el.currentTime = fraction * el.duration;
}

function useMemoryAudio(entry: Entry, el: HTMLAudioElement | null) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(entry.music.kind === "file" ? entry.music.analysis.duration : 0);

  const toggle = useCallback(async () => {
    if (!el) return;
    if (el.paused) {
      await analyserFor(el)?.ctx.resume().catch(() => undefined);
      await el.play().catch(() => undefined);
    } else el.pause();
  }, [el]);

  const seek = useCallback((fraction: number) => {
    if (el) seekElement(el, fraction);
  }, [el]);

  const level = useCallback(() => {
    const a = el ? analysers.get(el) : undefined;
    if (!a || !el || el.paused) return null;
    a.node.getByteTimeDomainData(a.buf);
    let sum = 0;
    for (let i = 0; i < a.buf.length; i++) {
      const v = (a.buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / a.buf.length) * 3.2);
  }, [el]);

  useEffect(() => {
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => Number.isFinite(el.duration) && setDuration(el.duration);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [el]);

  useEffect(() => () => {
    const a = el ? analysers.get(el) : undefined;
    if (a && el) {
      analysers.delete(el);
      void a.ctx.close().catch(() => undefined);
    }
  }, [el]);

  const position = useCallback(() => (el && !el.paused ? el.currentTime * 1000 : null), [el]);
  const isPaused = useCallback(() => el?.paused ?? true, [el]);

  return { toggle, seek, level, position, isPaused, playing, time, duration };
}

export function MemoryView({ entry, fresh = false }: { entry: Entry; fresh?: boolean }) {
  const d = entry.design;
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const audio = useMemoryAudio(entry, audioEl);
  const [reel, setReel] = useState(false);
  const vars = useMemo(() => designVars(d), [d]);
  const own = !entry.demo;

  return (
    <article className={`${s.memory} ${s[d.treatment]} ${d.palette.dark ? s.dark : s.light}`} style={vars}>
      {entry.music.kind === "file" && <audio ref={setAudioEl} src={entry.music.media.url} preload="metadata" loop crossOrigin="anonymous" />}

      <section className={`${s.stage} ${fresh ? s.developing : ""}`} aria-label="Memory">
        <div className={s.field}>
          <GenerativeField design={d} level={audio.level} />
        </div>
        <div className={s.lightLayer} aria-hidden />
        <Composition entry={entry} />
        <div className={s.textures} aria-hidden />
        <Ornaments entry={entry} />

        <div className={s.stageBar}>
          <button className={s.playMemory} onClick={() => setReel(true)}>
            <span className={s.playIcon} aria-hidden>▶</span>
            Play the memory
          </button>
          {entry.music.kind === "file" && (
            <button className={s.soundToggle} onClick={audio.toggle} aria-pressed={audio.playing}>
              {audio.playing ? "Pause song" : "Play song"}
            </button>
          )}
        </div>
      </section>

      <section className={`cv ${s.entrySection}`}>
        <div className={s.entryGrid}>
          <aside className={s.entryAside}>
            <p className={s.kicker}>{formatDay(entry.day)}</p>
            {entry.demo && <p className={s.demoTag}>Demonstration day</p>}
            <p className={s.atmosLine}>{entry.analysis.atmosphereLine}</p>
            {entry.analysis.events.length > 0 && (
              <ol className={s.events}>
                {entry.analysis.events.map((e, i) => <li key={i}>{e}</li>)}
              </ol>
            )}
          </aside>
          <div className={s.entryText}>
            <p className={s.kicker}>The entry, as written</p>
            {entry.text.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </div>
      </section>

      <Gallery entry={entry} />

      <section className={s.musicSection}>
        <p className={s.kicker}>The song of the day</p>
        <MusicBlock entry={entry} audio={audio} />
        {entry.narration && (
          <div className={s.narration}>
            <p className={s.kicker}>Voice note</p>
            <audio controls src={entry.narration.url} preload="none" />
          </div>
        )}
      </section>

      <Explain entry={entry} />

      <section className={s.actions}>
        <Actions entry={entry} own={own} />
      </section>

      {reel && <Reel entry={entry} audio={audio} onClose={() => setReel(false)} />}
    </article>
  );
}

function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % length), ms);
    return () => clearInterval(t);
  }, [length, ms]);
  return i;
}

function Composition({ entry }: { entry: Entry }) {
  const d = entry.design;
  const photos = entry.photos;
  const holdMs = Math.max(2400, d.motion.beatMs * d.motion.beatsPerCut * 2);
  const active = useCycle(photos.length, holdMs);
  const titleSize = `clamp(2.8rem, ${7 + d.type.scale * 4.5}vw, ${8 + d.type.scale * 3}rem)`;
  const title = <h1 className={s.title} style={titleStyle(d, titleSize)}>{entry.title}</h1>;
  const meta = (
    <p className={s.stageMeta}>
      <span>{formatDay(entry.day, "short")}</span>
      <span>{TREATMENT_LABEL[d.treatment]}</span>
      <span>{entry.musicProfile.bpm} bpm</span>
    </p>
  );

  const stack = (cls: string) => (
    <div className={`${s.stack} ${cls} ${s[`t_${d.motion.transition}`]}`}>
      {photos.map((p, i) => (
        <Photo key={p.media.key} src={p.media.url} alt={entry.analysis.photoNotes[i]?.subject ?? `Photograph ${i + 1}`} width={p.width} height={p.height} sizes="(max-width: 860px) 100vw, 60vw" className={i === active ? s.on : ""} priority={i === 0} />
      ))}
    </div>
  );

  switch (d.treatment) {
    case "film":
      return (
        <div className={s.compFilm}>
          <div className={s.filmFrame}>
            {stack(s.filmStack)}
            <span className={s.dateStamp}>{`'${entry.day.slice(2, 4)} ${entry.day.slice(5, 7)} ${entry.day.slice(8, 10)}`}</span>
          </div>
          <div className={s.filmText}>
            {meta}
            {title}
            <p className={s.atmosphere}>{entry.analysis.atmosphere}</p>
          </div>
        </div>
      );
    case "collage": {
      const rand = mulberry32(d.seed);
      return (
        <div className={s.compCollage}>
          <div className={s.collageBoard}>
            {photos.slice(0, 5).map((p, i) => {
              const rot = (rand() - 0.5) * 2 * d.composition.tilt;
              const pos = COLLAGE_SLOTS[photos.length > 4 ? 4 : photos.length - 1][i] ?? COLLAGE_SLOTS[4][i % 5];
              return (
                <figure key={p.media.key} className={s.print} style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, width: `${pos[2]}%`, "--r": `${rot.toFixed(1)}deg`, animationDelay: `${i * 120}ms` } as React.CSSProperties}>
                  <Photo src={p.media.url} alt={entry.analysis.photoNotes[i]?.subject ?? `Photograph ${i + 1}`} width={p.width} height={p.height} sizes="(max-width: 860px) 60vw, 520px" />
                  {i % 2 === 0 && <span className={s.tape} aria-hidden />}
                </figure>
              );
            })}
            <span className={s.sticker} aria-hidden>{entry.musicProfile.bpm}<small>bpm</small></span>
          </div>
          <div className={s.collageText}>
            {meta}
            {title}
          </div>
        </div>
      );
    }
    case "abstract":
      return (
        <div className={s.compAbstract}>
          {stack(s.abstractStack)}
          <div className={s.abstractText}>
            {meta}
            {title}
            <p className={s.atmosphere}>{entry.analysis.atmosphere}</p>
          </div>
        </div>
      );
    case "minimal":
      return (
        <div className={s.compMinimal}>
          {stack(s.minimalStack)}
          <div className={s.minimalText}>
            {title}
            {meta}
          </div>
        </div>
      );
    default:
      return (
        <div className={s.compEditorial}>
          <div className={s.editorialText}>
            {meta}
            {title}
            <p className={s.atmosLine}>{entry.analysis.atmosphereLine}</p>
          </div>
          {stack(s.editorialStack)}
        </div>
      );
  }
}

const COLLAGE_SLOTS: number[][][] = [
  [[18, 6, 64]],
  [[4, 10, 52], [44, 30, 50]],
  [[2, 4, 46], [48, 0, 42], [26, 42, 46]],
  [[0, 2, 42], [44, 0, 40], [6, 48, 40], [50, 40, 44]],
  [[0, 0, 38], [38, 4, 34], [70, 0, 30], [10, 46, 40], [52, 44, 40]],
];

function Ornaments({ entry }: { entry: Entry }) {
  const o = entry.design.ornaments;
  return (
    <div className={s.ornaments} aria-hidden>
      {o.includes("registration") && (
        <>
          <span className={`${s.reg} ${s.regTL}`} />
          <span className={`${s.reg} ${s.regBR}`} />
        </>
      )}
      {o.includes("sun") && <span className={s.sun} />}
    </div>
  );
}


function Gallery({ entry }: { entry: Entry }) {
  return (
    <section className={`cv ${s.gallery}`}>
      <p className={s.kicker}>Photographs · {entry.photos.length}</p>
      <div className={s.galleryGrid}>
        {entry.photos.map((p, i) => (
          <figure key={p.media.key} className={s.galleryItem} style={{ aspectRatio: `${p.width} / ${p.height}` }}>
            <Photo src={p.media.url} alt={entry.analysis.photoNotes[i]?.subject ?? `Photograph ${i + 1}`} width={p.width} height={p.height} sizes="(max-width: 760px) 92vw, 420px" />
            <figcaption>
              <span className={s.swatchRow}>
                {p.analysis.palette.slice(0, 5).map((c) => <i key={c.hex} style={{ background: c.hex }} />)}
              </span>
              {entry.analysis.photoNotes[i] ? <span>{entry.analysis.photoNotes[i].subject}</span> : <span>{p.analysis.lighting} light</span>}
              {p.credit && (
                <a href={p.credit.source} target="_blank" rel="noreferrer" className={s.credit}>
                  Photo: {p.credit.author} · CC0
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

type Audio = ReturnType<typeof useMemoryAudio>;

function MusicBlock({ entry, audio }: { entry: Entry; audio: Audio }) {
  const m = entry.music;
  const prof = entry.musicProfile;
  if (m.kind === "file") {
    const progress = audio.duration ? audio.time / audio.duration : 0;
    return (
      <div className={s.player}>
        <button className={s.bigPlay} onClick={audio.toggle} aria-label={audio.playing ? "Pause" : "Play"}>
          {audio.playing ? "❚❚" : "▶"}
        </button>
        <div className={s.playerBody}>
          <p className={s.songName}>{m.name}</p>
          <div
            className={s.scrub}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              audio.seek((e.clientX - r.left) / r.width);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") audio.seek(Math.min(1, progress + 0.05));
              if (e.key === "ArrowLeft") audio.seek(Math.max(0, progress - 0.05));
            }}
          >
            <Waveform envelope={prof.envelope} color="var(--m-accent)" height={44} progress={progress} />
          </div>
          <p className={s.musicStats}>
            <span>{fmtTime(audio.time)} / {fmtTime(audio.duration)}</span>
            <span>{prof.bpm} bpm</span>
            {prof.key && <span>{prof.key}</span>}
            <span>energy {Math.round(prof.energy * 100)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={s.linkPlayer}>
      {m.embedUrl ? (
        <iframe
          src={m.embedUrl}
          title={`${PROVIDER_LABEL[m.provider]} player`}
          className={m.provider === "youtube" ? s.embedVideo : s.embed}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : null}
      <div className={s.linkMeta}>
        <p className={s.songName}>{[m.title, m.artist].filter(Boolean).join(" — ") || "Linked song"}</p>
        <p className={s.musicStats}>
          <span>{prof.bpm} bpm ({prof.origin === "creator-tapped" ? "tapped" : "assumed"})</span>
          {prof.mode !== "unknown" && <span>{prof.mode}</span>}
          {prof.genre && <span>{prof.genre}</span>}
        </p>
        <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-small">
          {m.provider === "other" ? "Listen" : `Open in ${PROVIDER_LABEL[m.provider]}`} ↗
        </a>
      </div>
    </div>
  );
}

const fmtTime = (t: number) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

function Reel({ entry, audio, onClose }: { entry: Entry; audio: Audio; onClose: () => void }) {
  const d = entry.design;
  const cutMs = d.motion.beatMs * d.motion.beatsPerCut;
  const [tick, setTick] = useState(0);
  const startedAt = useRef(0);
  const lines = useMemo(() => [entry.title, ...entry.analysis.events.slice(0, 4), entry.analysis.atmosphereLine], [entry]);

  useEffect(() => {
    startedAt.current = performance.now();
    if (entry.music.kind === "file" && audio.isPaused()) void audio.toggle();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    let raf = 0;
    const loop = () => {
      const ms = audio.position() ?? performance.now() - startedAt.current;
      setTick(Math.floor(ms / cutMs));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photo = tick % entry.photos.length;
  const line = Math.floor(tick / 2) % lines.length;

  return (
    <div className={`${s.reel} ${s[`t_${d.motion.transition}`]}`} role="dialog" aria-modal="true" aria-label={`${entry.title} — reel`}>
      <div className={s.reelPhotos}>
        {entry.photos.map((p, i) => (
          <Photo key={p.media.key} src={p.media.url} alt="" width={p.width} height={p.height} sizes="100vw" className={i === photo ? s.on : ""} style={{ "--kb": `${(i % 2 ? -1 : 1) * 2}%` } as React.CSSProperties} />
        ))}
      </div>
      <div className={s.reelField}>
        <GenerativeField design={d} level={audio.level} intensity={0.8} />
      </div>
      <div className={s.textures} aria-hidden />
      <p key={line} className={s.reelLine} style={line === 0 ? titleStyle(d, "clamp(2.6rem, 8vw, 7rem)") : undefined}>
        {lines[line]}
      </p>
      <div className={s.reelBar}>
        <span className={s.reelMeta}>{formatDay(entry.day, "short")} · {d.motion.bpm} bpm · cut every {d.motion.beatsPerCut} beats</span>
        {entry.music.kind === "file" ? (
          <button className="btn btn-small" onClick={audio.toggle}>{audio.playing ? "Pause" : "Play"} song</button>
        ) : entry.music.embedUrl ? (
          <span className={s.reelMeta}>Press play on the {PROVIDER_LABEL[entry.music.provider]} player below to hear the song</span>
        ) : null}
        <button className="btn btn-small btn-light" onClick={onClose}>Close</button>
      </div>
      {entry.music.kind === "link" && entry.music.embedUrl && (
        <iframe src={entry.music.embedUrl} title="Song" className={s.reelEmbed} allow="autoplay; encrypted-media" />
      )}
    </div>
  );
}

function Actions({ entry, own }: { entry: Entry; own: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rename = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/memories/${entry.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? "Could not rename");
    setRenaming(false);
    router.refresh();
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/memories/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      return setError((await res.json().catch(() => null))?.error ?? "Could not delete");
    }
    router.push("/archive");
    router.refresh();
  };

  return (
    <div className={s.actionsInner}>
      <div className={s.actionRow}>
        <Link href="/archive" className="btn btn-small">← Archive</Link>
        <a href={`/api/memories/${entry.id}/folder`} className="btn btn-small" download>Download day folder</a>
        {own && <Link href={`/m/${entry.id}/edit`} className="btn btn-small">Edit &amp; redevelop</Link>}
        {own && <button className="btn btn-small" onClick={() => setRenaming((v) => !v)}>Rename</button>}
        {own && <button className="btn btn-small btn-danger" onClick={() => setConfirming(true)}>Delete</button>}
      </div>
      {!own && <p className={s.small}>This is a demonstration day. It cannot be edited or deleted — start your own with “New day”.</p>}
      {renaming && (
        <form className={s.renameForm} onSubmit={(e) => { e.preventDefault(); void rename(); }}>
          <input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
          <button className="btn btn-small btn-light" disabled={busy || !title.trim()}>Save title</button>
        </form>
      )}
      {confirming && (
        <div className={s.confirm} role="alertdialog" aria-label="Delete this memory?">
          <p>Delete “{entry.title}” with its photographs, music and voice note? This cannot be undone.</p>
          <div className={s.actionRow}>
            <button className="btn btn-small" onClick={() => setConfirming(false)}>Keep it</button>
            <button className="btn btn-small btn-danger" onClick={remove} disabled={busy}>Delete forever</button>
          </div>
        </div>
      )}
      {error && <p className="notice error">{error}</p>}
    </div>
  );
}
