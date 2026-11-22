"use client";

import { Reorder } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioAnalysis, Entry, ImageAnalysis, MediaRef, MusicFeel } from "@/lib/types";
import { analyzeTextLocally } from "@/lib/analysis/text";
import { analyzeAudioFile, preparePhoto, uploadMedia, type AppConfig } from "@/lib/client/media";
import { PROVIDER_LABEL } from "@/lib/music-link";
import { countMood } from "@/lib/analysis/mood";
import { blendThemes } from "@/lib/engine/presets";
import { faceFor } from "@/lib/engine/typeface";
import { aiMusic, aiTitle, type TrackHit } from "@/lib/ai";
import { useAiStatus } from "@/lib/ai/engine";
import { setMascotContext } from "@/lib/client/mascot-context";
import { SongSearch } from "./SongSearch";
import { VoiceInput } from "./VoiceInput";
import { Icon } from "./Icon";
import { MoodMeter } from "./MoodMeter";
import { Waveform } from "./Waveform";
import s from "./Composer.module.css";

type PhotoItem = {
  id: string;
  preview: string;
  status: "processing" | "ready" | "error";
  error?: string;
  blob?: Blob;
  media?: MediaRef;
  analysis?: ImageAnalysis;
};

type FileMusic = { kind: "file"; name: string; file?: File; media?: MediaRef; preview: string; analysis?: AudioAnalysis; status: "processing" | "ready" | "error"; error?: string };
type LinkPreview = { provider: keyof typeof PROVIDER_LABEL; embedUrl: string | null; title: string | null; artist: string | null; thumbnail: string | null; url: string };
type LinkMusic = { kind: "link"; url: string; reason?: string; pickedBy?: "ai" | "local"; trackId?: string; spotifyUrl?: string; analysis?: AudioAnalysis; measuring?: boolean; preview: LinkPreview | null; status: "idle" | "loading" | "ready" | "error"; error?: string; feel: MusicFeel };
type Narration = { blob?: Blob; media?: MediaRef; url: string };

const AUDIO_TYPES: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", oga: "audio/ogg", webm: "audio/webm", flac: "audio/flac" };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const PROMPTS = [
  "Where were you when the light changed?",
  "Who was there, and what did their voice sound like?",
  "What did your hands hold today?",
  "What did the air smell like?",
];

export function Composer({ config, initial, draft }: { config: AppConfig; initial?: Entry; draft?: string }) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [day, setDay] = useState(initial?.day ?? today());
  const [text, setText] = useState(initial?.text ?? draft ?? "");
  const [title, setTitle] = useState(initial?.titleLocked ? initial.title : "");
  const [photos, setPhotos] = useState<PhotoItem[]>(
    () => initial?.photos.map((p) => ({ id: p.media.key, preview: p.media.url, status: "ready", media: p.media, analysis: p.analysis })) ?? [],
  );
  const [music, setMusic] = useState<FileMusic | LinkMusic | null>(() => {
    if (!initial) return null;
    const m = initial.music;
    if (m.kind === "file") return { kind: "file", name: m.name, media: m.media, preview: m.media.url, analysis: m.analysis, status: "ready" };
    return {
      kind: "link", url: m.url, status: "ready",
      preview: { provider: m.provider, embedUrl: m.embedUrl, title: m.title, artist: m.artist, thumbnail: m.thumbnail, url: m.url },
      feel: m.feel ?? { bpm: null, energy: 0.5, mode: "unknown" },
    };
  });
  const [musicTab, setMusicTab] = useState<"file" | "link" | "ai" | "spotify">(initial?.music.kind ?? "ai");
  const [narration, setNarration] = useState<Narration | null>(initial?.narration ? { media: initial.narration, url: initial.narration.url } : null);
  const [phase, setPhase] = useState<{ step: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [reading, setReading] = useState(() => (text.trim().length > 20 ? analyzeTextLocally(text) : null));
  useEffect(() => {
    const t = setTimeout(() => setReading(text.trim().length > 20 ? analyzeTextLocally(text) : null), 350);
    return () => clearTimeout(t);
  }, [text]);

  const mood = useMemo(() => countMood(text), [text]);
  // The theme follows the words calmly: it waits for a pause in typing, then the
  // colours ease over a few seconds (registered CSS properties in globals.css).
  const [settled, setSettled] = useState(() => ({ mood, reading }));
  useEffect(() => {
    const t = setTimeout(() => setSettled({ mood, reading }), 1200);
    return () => clearTimeout(t);
  }, [mood, reading]);
  const blend = useMemo(() => blendThemes(settled.mood, settled.reading), [settled]);
  const themed = settled.mood.hits.length > 0;
  const face = useMemo(() => faceFor(settled.mood, settled.reading), [settled]);
  const dayVars = (themed
    ? {}
    : {}) as React.CSSProperties;
  useEffect(() => { setMascotContext(text); }, [text]);
  useEffect(() => () => setMascotContext(""), []);

  const [wish, setWish] = useState("");
  const [autoMusic, setAutoMusic] = useState(false);
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);

  const [picked, setPicked] = useState<string[]>([]);
  const aiReady = useAiStatus().state === "ready";

  const applyTrack = useCallback((tr: TrackHit, extra?: { reason?: string; feel?: MusicFeel; pickedBy?: "ai" | "local" }) => {
    setMusic({
      kind: "link", url: tr.url, status: "ready", reason: extra?.reason, pickedBy: extra?.pickedBy, trackId: tr.id, spotifyUrl: tr.spotifyUrl,
      preview: { provider: tr.source === "spotify" ? "spotify" : "apple", embedUrl: tr.embedUrl, title: tr.title, artist: tr.artist, thumbnail: tr.image, url: tr.url },
      feel: extra?.feel ?? { bpm: null, energy: 0.5, mode: "unknown" },
      measuring: Boolean(tr.previewUrl),
    });
    if (!tr.previewUrl) return;
    // Listen to the official 30-second preview in the browser: real tempo, key and energy shape the memory.
    // The preview is only analysed here — it is never stored or re-shared.
    void (async () => {
      let analysis: AudioAnalysis | undefined;
      try {
        const res = await fetch(tr.previewUrl!);
        if (res.ok) analysis = await analyzeAudioFile(new File([await res.blob()], "preview.m4a", { type: res.headers.get("content-type") ?? "audio/mp4" }));
      } catch {}
      setMusic((m) => (m?.kind === "link" && m.trackId === tr.id
        ? { ...m, measuring: false, analysis, feel: analysis ? { bpm: analysis.bpm, energy: analysis.energy, mode: analysis.mode } : m.feel }
        : m));
    })();
  }, []);

  const pickSong = useCallback(async (): Promise<{ title: string; artist: string; reason: string } | null> => {
    if (text.trim().length < 12) { setError("Write a little about the day first, so the AI knows what to pick."); return null; }
    setPicking(true);
    setError(null);
    try {
      const song = await aiMusic(text, wish.trim() || undefined, picked);
      setPicked((p) => [...p, `${song.title} — ${song.artist}`]);
      setMusicTab("ai");
      const feel: MusicFeel = { bpm: Math.round(song.bpm), energy: song.energy, mode: song.mode };
      if (song.track) applyTrack(song.track, { reason: song.reason, feel, pickedBy: song.source });
      else {
        const url = `https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`;
        setMusic({ kind: "link", url: "", status: "error", error: "That song could not be found in the catalogue — try again or search.", reason: song.reason, spotifyUrl: url, preview: null, feel });
        return null;
      }
      return { title: song.title, artist: song.artist, reason: song.reason };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pick a song");
      return null;
    } finally {
      setPicking(false);
    }
  }, [text, wish, picked, applyTrack]);

  // "Choose for me": pick once the day has enough words and no song is set yet.
  useEffect(() => {
    if (!autoMusic || picking || (music && music.status === "ready") || (music?.kind === "link" && music.reason) || text.trim().length < 60) return;
    const t = setTimeout(pickSong, 1500);
    return () => clearTimeout(t);
  }, [autoMusic, picking, music, text, pickSong]);

  const suggestTitle = async () => {
    if (text.trim().length < 12) return setError("Write a little about the day first.");
    setNaming(true);
    try {
      setTitle((await aiTitle(text)).title);
    } finally {
      setNaming(false);
    }
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readyPhotos = photos.filter((p) => p.status === "ready");
  const musicReady = music?.kind === "file" ? music.status === "ready" : music?.kind === "link" ? music.status === "ready" : false;
  const textReady = text.trim().length >= 12;
  const busyPhotos = photos.some((p) => p.status === "processing");
  const doneCount = Number(textReady) + Number(readyPhotos.length > 0) + Number(musicReady);
  const canDevelop = textReady && readyPhotos.length > 0 && musicReady && !busyPhotos && !phase;

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    const room = 12 - photos.length;
    const take = list.slice(0, Math.max(0, room));
    if (list.length > take.length) setError("A day can hold up to 12 photographs.");
    const items: PhotoItem[] = take.map(() => ({ id: crypto.randomUUID(), preview: "", status: "processing" }));
    setPhotos((prev) => [...prev, ...items]);
    await Promise.all(
      take.map(async (file, i) => {
        try {
          const p = await preparePhoto(file);
          setPhotos((prev) => prev.map((x) => (x.id === items[i].id ? { ...x, preview: p.preview, blob: p.blob, analysis: p.analysis, status: "ready" } : x)));
        } catch (e) {
          setPhotos((prev) => prev.map((x) => (x.id === items[i].id ? { ...x, status: "error", error: e instanceof Error ? e.message : "Could not read image" } : x)));
        }
      }),
    );
  }, [photos.length]);

  const move = (id: string, dir: -1 | 1) =>
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const pickAudio = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = file.type || AUDIO_TYPES[ext];
    if (!type || !type.startsWith("audio/")) return setError("That file does not look like audio.");
    if (file.size > 40 * 1024 * 1024) return setError("Audio files can be up to 40 MB.");
    const typed = file.type ? file : new File([file], file.name, { type });
    const preview = URL.createObjectURL(typed);
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    setMusic({ kind: "file", name, file: typed, preview, status: "processing" });
    try {
      const analysis = await analyzeAudioFile(typed);
      setMusic((m) => (m?.kind === "file" && m.preview === preview ? { ...m, analysis, status: "ready" } : m));
    } catch (e) {
      setMusic((m) => (m?.kind === "file" && m.preview === preview ? { ...m, status: "error", error: e instanceof Error ? e.message : "Could not analyse audio" } : m));
    }
  };

  const linkUrl = music?.kind === "link" ? music.url : "";
  useEffect(() => {
    if (music?.kind !== "link" || !linkUrl.trim() || music.status === "ready" && music.preview?.url) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setMusic((m) => (m?.kind === "link" ? { ...m, status: "loading", error: undefined } : m));
      try {
        const res = await fetch(`/api/music?url=${encodeURIComponent(linkUrl.trim())}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Link not recognised");
        setMusic((m) => (m?.kind === "link" && m.url === linkUrl ? { ...m, preview: json, status: "ready" } : m));
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setMusic((m) => (m?.kind === "link" && m.url === linkUrl ? { ...m, preview: null, status: "error", error: e instanceof Error ? e.message : "Link not recognised" } : m));
      }
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkUrl]);

  const develop = async () => {
    setTouched(true);
    setError(null);
    if (!canDevelop || !music) return;
    try {
      // An empty title is named on the server (by Claude when configured, otherwise from the words).
      const finalTitle: string | null = title.trim() || null;
      const total = photos.filter((p) => !p.media).length + (music.kind === "file" && !music.media ? 1 : 0) + (narration && !narration.media ? 1 : 0);
      let done = 0;
      const step = (label: string) => setPhase({ step: label, progress: total ? done / (total + 1) : 0.1 });

      const uploaded: { media: MediaRef; analysis: ImageAnalysis }[] = [];
      for (const [i, p] of readyPhotos.entries()) {
        if (p.media) uploaded.push({ media: p.media, analysis: p.analysis! });
        else {
          step(`Fixing photograph ${i + 1} of ${readyPhotos.length}`);
          const media = await uploadMedia(p.blob!, "image", config);
          done++;
          setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, media } : x)));
          uploaded.push({ media, analysis: p.analysis! });
        }
      }

      let musicBody: unknown;
      if (music.kind === "file") {
        let media = music.media;
        if (!media) {
          step("Pressing the song into the record");
          media = await uploadMedia(music.file!, "audio", config, (p) => setPhase({ step: `Pressing the song into the record · ${Math.round(p * 100)}%`, progress: (done + p) / (total + 1) }));
          done++;
          const m = media;
          setMusic((prev) => (prev?.kind === "file" ? { ...prev, media: m } : prev));
        }
        musicBody = { kind: "file", media: { key: media.key, contentType: media.contentType, size: media.size }, name: music.name, analysis: music.analysis };
      } else {
        musicBody = { kind: "link", url: music.preview?.url ?? music.url, title: music.preview?.title ?? null, artist: music.preview?.artist ?? null, feel: music.feel.bpm || music.feel.mode !== "unknown" ? music.feel : null, analysis: music.analysis ?? null };
      }

      let narrationBody: unknown = null;
      if (narration) {
        let media = narration.media;
        if (!media) {
          step("Keeping your voice note");
          media = await uploadMedia(narration.blob!, "narration", config);
          done++;
        }
        narrationBody = { key: media.key, contentType: media.contentType, size: media.size };
      }

      setPhase({ step: "Reading the day — words, light and colour", progress: total / (total + 1) });
      const res = await fetch(editing ? `/api/memories/${initial!.id}` : "/api/memories", {
        method: editing ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day,
          text,
          title: finalTitle,
          photos: uploaded.map((u) => ({ media: { key: u.media.key, contentType: u.media.contentType, size: u.media.size }, analysis: u.analysis })),
          music: musicBody,
          narration: narrationBody,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "The memory could not be developed");
      setPhase({ step: "Developing", progress: 1 });
      router.push(`/m/${json.id}?new=1`);
      router.refresh();
    } catch (e) {
      setPhase(null);
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const prompt = useMemo(() => PROMPTS[Math.floor((day.charCodeAt(9) || 0) % PROMPTS.length)], [day]);

  return (
    <div className={s.composer} style={dayVars}>
      <div className={s.dayAura} aria-hidden />
      <div className={s.main}>
        <section className={`glass ${s.block}`}>
          <header className={s.blockHead}>
            <span className={s.num}><Icon name="pen" size={18} /></span>
            <h2>The day, in your words</h2>
          </header>
          <div className={s.dateRow}>
            <label className="meta" htmlFor="day">Date</label>
            <input id="day" type="date" className="input" value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
          </div>
          <textarea
            className={s.textarea}
            data-face={face.key}
            style={{ fontFamily: face.family, fontSize: `calc(clamp(1.05rem, 1.4vw, 1.18rem) * ${face.scale})`, fontWeight: face.weight }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write about today. ${prompt}`}
            aria-label="What happened today, and how did it feel?"
            maxLength={8000}
          />
          <VoiceInput onText={(said) => setText((t) => (t.trim() ? `${t.trimEnd()} ${said}` : said).slice(0, 8000))} />
          <div className={s.readingRow}>
            <span className={s.faceTag} title={face.reason}>
              <i style={{ fontFamily: face.family }}>Aa</i>
              <span>{face.label}<em> · {face.reason}</em></span>
            </span>
            <span className="meta">{words} words</span>
            {reading ? (
              <span className={s.reading} aria-live="polite">
                <span className="meta">Reading so far</span>
                {reading.feelings.slice(0, 3).map((f) => <span key={f} className="chip">{f}</span>)}
                {reading.timeOfDay !== "unknown" && <span className="chip">{reading.timeOfDay.replace("-", " ")}</span>}
                {reading.season !== "unknown" && <span className="chip">{reading.season}</span>}
                {reading.motifs.slice(0, 3).map((m) => <span key={m} className="chip">{m}</span>)}
              </span>
            ) : (
              <span className="meta">A few sentences are enough</span>
            )}
          </div>
          {touched && !textReady && <p className="notice error">Write at least a sentence or two about the day.</p>}
        </section>

        <section className={`glass ${s.block}`}>
          <header className={s.blockHead}>
            <span className={s.num}><Icon name="image" size={18} /></span>
            <h2>Photographs</h2>
            <span className="meta">{photos.length}/12 · first one leads</span>
          </header>
          <DropZone onFiles={addPhotos} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple label="Drop photographs here, or choose from your device" hint="JPEG, PNG or WebP · resized and analysed in your browser" />
          {photos.length > 0 && (
            <Reorder.Group axis="x" values={photos} onReorder={setPhotos} className={s.strip}>
              {photos.map((p, i) => (
                <Reorder.Item key={p.id} value={p} className={s.thumb} whileDrag={{ scale: 1.05, zIndex: 3 }}>
                  {p.status === "processing" && <div className={`${s.thumbImg} skeleton`} />}
                  {p.status === "error" && <div className={s.thumbErr}>{p.error}</div>}
                  {p.status === "ready" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img decoding="async" src={p.preview} alt={`Photograph ${i + 1}`} className={s.thumbImg} draggable={false} />
                  )}
                  <div className={s.thumbBar}>
                    <span className={s.swatches}>{p.analysis?.palette.slice(0, 4).map((c) => <i key={c.hex} style={{ background: c.hex }} />)}</span>
                    <span className={s.thumbBtns}>
                      <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="Move earlier">←</button>
                      <button type="button" onClick={() => move(p.id, 1)} disabled={i === photos.length - 1} aria-label="Move later">→</button>
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} aria-label="Remove photograph">✕</button>
                    </span>
                  </div>
                  {i === 0 && <span className={s.lead}>Lead</span>}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          {touched && readyPhotos.length === 0 && <p className="notice error">Add at least one photograph.</p>}
        </section>

        <section id="song-of-the-day" className={`glass ${s.block}`}>
          <header className={s.blockHead}>
            <span className={s.num}><Icon name="music" size={18} /></span>
            <h2>The song of the day</h2>
          </header>
          <div className="segmented" role="group" aria-label="Music source">
            <button type="button" aria-pressed={musicTab === "ai"} onClick={() => setMusicTab("ai")}>✦ Pick for me</button>
            <button type="button" aria-pressed={musicTab === "spotify"} onClick={() => setMusicTab("spotify")}>Search songs</button>
            <button type="button" aria-pressed={musicTab === "file"} onClick={() => setMusicTab("file")}>Audio file</button>
            <button type="button" aria-pressed={musicTab === "link"} onClick={() => { setMusicTab("link"); if (music?.kind !== "link" || music.reason || music.trackId) setMusic({ kind: "link", url: "", preview: null, status: "idle", feel: { bpm: null, energy: 0.5, mode: "unknown" } }); }}>
              Music link
            </button>
          </div>

          {musicTab === "ai" && (
            <div className={s.musicPane}>
              <input className="input" value={wish} maxLength={300} onChange={(e) => setWish(e.target.value)} placeholder="Describe the music you want — e.g. “calm piano for a rainy evening” (optional)" aria-label="Describe the music you want" />
              <div className={s.aiRow}>
                <button type="button" className="btn btn-primary btn-small" onClick={pickSong} disabled={picking}>
                  {picking ? "Listening to your day…" : music?.kind === "link" && music.reason ? "Pick another" : aiReady ? "Let AI choose" : "Pick from my mood"}
                </button>
                <label className={s.auto}>
                  <input type="checkbox" checked={autoMusic} onChange={(e) => setAutoMusic(e.target.checked)} /> choose automatically for me
                </label>
              </div>
              {music?.kind === "link" && music.reason && music.status === "error" && <p className="notice error">{music.error}</p>}
              {music?.kind === "link" && music.reason && music.preview && <TrackCard music={music} />}
            </div>
          )}

          {musicTab === "spotify" && (
            <div className={s.musicPane}>
              <SongSearch onPick={(tr) => applyTrack(tr)} selectedId={music?.kind === "link" ? music.trackId : null} />
              {music?.kind === "link" && music.trackId && !music.reason && music.preview && (
                <>
                  <TrackCard music={music} />
                  {!music.analysis && !music.measuring && <FeelControls feel={music.feel} onChange={(feel) => setMusic({ ...music, feel })} />}
                </>
              )}
            </div>
          )}

          {musicTab === "file" && (
            <div className={s.musicPane}>
              {music?.kind === "file" ? (
                <div className={s.songCard}>
                  <div className={s.songTop}>
                    <div>
                      <p className={s.songName}>{music.name}</p>
                      {music.status === "processing" && <p className="meta">Listening — measuring tempo, energy and key…</p>}
                      {music.status === "error" && <p className="notice error">{music.error}</p>}
                      {music.analysis && (
                        <p className={s.stats}>
                          <span>{music.analysis.bpm} bpm</span><span>{music.analysis.key}</span><span>energy {Math.round(music.analysis.energy * 100)}%</span><span>{Math.round(music.analysis.duration)} s</span>
                        </p>
                      )}
                    </div>
                    <button type="button" className="btn btn-small" onClick={() => setMusic(null)}>Change</button>
                  </div>
                  {music.analysis && <Waveform envelope={music.analysis.envelope} color="var(--safelight)" height={40} />}
                  <audio controls src={music.preview} preload="metadata" className={s.audio} />
                </div>
              ) : (
                <DropZone onFiles={(f) => f[0] && pickAudio(f[0])} accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac" label="Drop a song you own, or choose a file" hint="MP3, WAV, M4A, OGG · up to 40 MB · analysed in your browser, stored privately" />
              )}
            </div>
          )}

          {musicTab === "link" && music?.kind === "link" && (
            <div className={s.musicPane}>
              <input
                className="input"
                type="url"
                inputMode="url"
                placeholder="Paste a Spotify, YouTube, SoundCloud or Apple Music link"
                value={music.url}
                onChange={(e) => setMusic({ ...music, url: e.target.value, status: e.target.value ? "loading" : "idle", preview: null })}
                aria-label="Music link"
              />
              {music.status === "loading" && <p className="meta">Looking up the song…</p>}
              {music.status === "error" && <p className="notice error">{music.error}</p>}
              {music.preview && (
                <div className={s.linkCard}>
                  {music.preview.embedUrl && (
                    <iframe src={music.preview.embedUrl} title="Song preview" className={music.preview.provider === "youtube" ? s.embedVideo : s.embed} allow="encrypted-media; clipboard-write" loading="lazy" />
                  )}
                  <p className={s.songName}>{[music.preview.title, music.preview.artist].filter(Boolean).join(" — ") || PROVIDER_LABEL[music.preview.provider]}</p>
                  <FeelControls feel={music.feel} onChange={(feel) => setMusic({ ...music, feel })} />
                </div>
              )}
            </div>
          )}
          {touched && !musicReady && <p className="notice error">Add a song — an audio file or a link.</p>}
        </section>

        <section className={`glass ${s.block}`}>
          <header className={s.blockHead}>
            <span className={s.num}><Icon name="mic" size={18} /></span>
            <h2>A voice note <em>(optional)</em></h2>
          </header>
          <Recorder value={narration} onChange={setNarration} />
        </section>
      </div>

      <aside className={s.summary}>
        <div className={`glass ${s.summaryInner}`}>
          <MoodMeter mood={mood} blend={blend} themed={themed} />
          <hr className="rule" />
          <p className="meta">Your memory</p>
          <div className={s.progress} aria-label={`${doneCount} of 3 required steps done`}>
            <i style={{ width: `${(doneCount / 3) * 100}%` }} />
          </div>
          <ul className={s.checklist}>
            <li data-ok={textReady}>{textReady ? `${words} words written` : "Words about the day"}</li>
            <li data-ok={readyPhotos.length > 0}>{readyPhotos.length ? `${readyPhotos.length} photograph${readyPhotos.length > 1 ? "s" : ""}` : "At least one photograph"}</li>
            <li data-ok={musicReady}>
              {music?.kind === "file" && music.analysis ? `${music.name} · ${music.analysis.bpm} bpm` : music?.kind === "link" && music.preview ? music.preview.title ?? "Linked song" : "A song"}
            </li>
            <li data-ok={Boolean(narration)} data-optional>{narration ? "Voice note recorded" : "Voice note (optional)"}</li>
          </ul>

          {readyPhotos.length > 0 && (
            <div className={s.mosaic} aria-hidden>
              {readyPhotos.flatMap((p) => p.analysis!.palette.slice(0, 3)).slice(0, 18).map((c, i) => <i key={i} style={{ background: c.hex, flexGrow: c.weight * 10 }} />)}
            </div>
          )}

          <label className={s.titleField}>
            <span className={s.titleHead}>
              <span className="meta">Title</span>
              <button type="button" className={s.suggest} onClick={suggestTitle} disabled={naming}>{naming ? "naming…" : "✦ suggest"}</button>
            </span>
            <input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={editing && initial ? initial.title : aiReady ? "Leave empty — AI will name it for you" : "Leave empty — Felt names it from your words"} />
          </label>

          <p className={s.fine}>Photographs and music are analysed in your browser. When AI is switched on, the text you write is sent to an AI service to name the day, describe its atmosphere and suggest songs. Song searches only send the search words to a music catalogue.</p>

          {!config.persistent && <p className="notice">Storage on this deployment is temporary. Connect a Vercel Blob store to keep memories.</p>}
          {error && <p className="notice error" role="alert">{error}</p>}

          <button type="button" className={`btn btn-primary ${s.develop} ${canDevelop ? s.ready : ""}`} onClick={develop} disabled={Boolean(phase) || busyPhotos}>
            {editing ? "Redevelop memory" : canDevelop ? "Develop memory ✦" : `Develop memory · ${3 - doneCount} step${3 - doneCount === 1 ? "" : "s"} left`}
          </button>
          <p className={s.fine}>Your diary is private to this browser’s diary key.</p>
        </div>
      </aside>

      {phase && <Darkroom step={phase.step} progress={phase.progress} photos={readyPhotos.map((p) => p.preview)} />}
    </div>
  );
}

function DropZone({ onFiles, accept, multiple, label, hint }: { onFiles: (f: FileList | File[]) => void; accept: string; multiple?: boolean; label: string; hint: string }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`${s.drop} ${over ? s.over : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
    >
      <span className={s.dropPlus}><Icon name="upload" size={20} /></span>
      <span>{label}</span>
      <span className="meta">{hint}</span>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function FeelControls({ feel, onChange }: { feel: MusicFeel; onChange: (f: MusicFeel) => void }) {
  const taps = useRef<number[]>([]);
  const [flash, setFlash] = useState(false);
  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now].slice(-9);
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
    if (taps.current.length >= 4) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i]).sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)];
      onChange({ ...feel, bpm: Math.round(60000 / median) });
    }
  };
  return (
    <div className={s.feel}>
      <p className={s.fine}>
        Streaming services don’t share their audio, so tell Felt how the song moves.
      </p>
      <div className={s.feelRow}>
        <button type="button" className={`${s.tap} ${flash ? s.tapFlash : ""}`} onClick={tap}>
          {feel.bpm ? `${feel.bpm} bpm` : "Tap the beat"}
        </button>
        {feel.bpm && <button type="button" className="btn btn-small btn-ghost" onClick={() => { taps.current = []; onChange({ ...feel, bpm: null }); }}>Reset</button>}
      </div>
      <label className={s.slider}>
        <span className="meta">Energy</span>
        <input type="range" min={0} max={100} value={Math.round(feel.energy * 100)} onChange={(e) => onChange({ ...feel, energy: Number(e.target.value) / 100 })} />
        <span className="meta">{Math.round(feel.energy * 100)}%</span>
      </label>
      <div className="segmented" role="group" aria-label="Character">
        {(["major", "minor", "unknown"] as const).map((m) => (
          <button type="button" key={m} aria-pressed={feel.mode === m} onClick={() => onChange({ ...feel, mode: m })}>
            {m === "major" ? "Bright" : m === "minor" ? "Shadowed" : "Not sure"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Recorder({ value, onChange }: { value: Narration | null; onChange: (n: Narration | null) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
        onChange({ blob, url: URL.createObjectURL(blob) });
        setRec(null);
        if (timer.current) clearInterval(timer.current);
      };
      r.start();
      setRec(r);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((v) => {
        if (v >= 179) r.stop();
        return v + 1;
      }), 1000);
    } catch {
      setErr("Microphone access was not granted.");
    }
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (value && !rec) {
    return (
      <div className={s.voice}>
        <audio controls src={value.url} className={s.audio} />
        <button type="button" className="btn btn-small" onClick={() => onChange(null)}>Remove</button>
      </div>
    );
  }
  return (
    <div className={s.voice}>
      {rec ? (
        <button type="button" className={`btn ${s.recording}`} onClick={() => rec.stop()}>
          <span className={s.recDot} /> Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </button>
      ) : (
        <button type="button" className="btn" onClick={start}>● Record up to 3 minutes</button>
      )}
      <span className="meta">Narrate the day in your own voice; it is kept with the memory.</span>
      {err && <p className="notice error">{err}</p>}
    </div>
  );
}

function Darkroom({ step, progress, photos }: { step: string; progress: number; photos: string[] }) {
  return (
    <div className={s.darkroom} role="status" aria-live="polite">
      <span className={s.aurora} aria-hidden />
      <div className={s.tray}>
        {photos.slice(0, 3).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img decoding="async" key={p} src={p} alt="" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </div>
      <p className={s.darkStep}>{step}</p>
      <div className={s.darkBar}><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <p className="meta">Developing your memory</p>
    </div>
  );
}

function TrackCard({ music }: { music: LinkMusic }) {
  const p = music.preview!;
  return (
    <div className={s.linkCard}>
      {p.embedUrl && <iframe src={p.embedUrl} title="Song preview" className={s.embed} allow="autoplay; encrypted-media; clipboard-write" loading="lazy" />}
      <p className={s.songName}>{[p.title, p.artist].filter(Boolean).join(" — ")}</p>
      {music.reason && <p className={s.fine}>{music.pickedBy === "ai" ? "Chosen by AI: " : "Chosen from the mood of your words: "}{music.reason}</p>}
      {music.measuring ? (
        <p className={s.fine}>Listening to the 30-second preview — measuring tempo, key and energy…</p>
      ) : music.analysis ? (
        <p className={s.stats}><span>{music.analysis.bpm} bpm</span><span>{music.analysis.key}</span><span>energy {Math.round(music.analysis.energy * 100)}%</span><span>measured from preview</span></p>
      ) : music.reason && music.feel.bpm ? (
        <p className={s.stats}><span>~{music.feel.bpm} bpm</span><span>{music.feel.mode === "major" ? "bright" : "shadowed"}</span><span>energy {Math.round(music.feel.energy * 100)}%</span><span>estimated</span></p>
      ) : null}
      {music.spotifyUrl && <a className={s.fine} href={music.spotifyUrl} target="_blank" rel="noreferrer">Open in Spotify ↗</a>}
    </div>
  );
}
