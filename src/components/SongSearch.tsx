"use client";

import { useEffect, useState } from "react";
import { searchSongs, type TrackHit } from "@/lib/ai";
import s from "./SongSearch.module.css";

const time = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}` : "");

/** Search the Spotify catalogue and pick a real track. */
export function SongSearch({ onPick, selectedId }: { onPick: (t: TrackHit) => void; selectedId?: string | null }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; tracks: TrackHit[]; provider?: string; error?: string }>({ status: "idle", tracks: [] });

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setState((p) => ({ ...p, status: "loading" }));
      try {
        const out = await searchSongs(query, 8, ctrl.signal);
        setState({ status: "done", tracks: out.tracks, provider: out.provider });
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ status: "error", tracks: [], error: e instanceof Error ? e.message : "Search failed" });
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const view = q.trim().length < 2 ? { status: "idle" as const, tracks: [] as TrackHit[], provider: undefined, error: undefined } : state;

  return (
    <div className={s.wrap}>
      <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Spotify — a song, an artist, a feeling…" aria-label="Search Spotify" maxLength={200} />
      {view.status === "loading" && <p className={s.meta}>Searching…</p>}
      {view.status === "error" && <p className="notice error">{view.error}</p>}
      {view.status === "done" && view.tracks.length === 0 && <p className={s.meta}>No songs found — try other words.</p>}
      {view.tracks.length > 0 && (
        <ul className={s.list}>
          {view.tracks.map((t) => (
            <li key={t.id}>
              <button type="button" className={s.item} aria-pressed={selectedId === t.id} onClick={() => onPick(t)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.image ? <img src={t.image} alt="" width={48} height={48} loading="lazy" /> : <span className={s.noart} />}
                <span className={s.names}>
                  <strong>{t.title}</strong>
                  <span>{t.artist}{t.album ? ` · ${t.album}` : ""}</span>
                </span>
                <span className={s.time}>{time(t.durationMs)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {view.provider === "itunes" && <p className={s.meta}>Spotify is not connected on this server yet — showing matches from a public catalogue, each linked to Spotify.</p>}
    </div>
  );
}
