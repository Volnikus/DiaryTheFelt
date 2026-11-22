import type { MusicInput, MusicProfile, TextAnalysis } from "../types.ts";

export function toMusicProfile(music: MusicInput, text: TextAnalysis): MusicProfile {
  if (music.kind === "file") {
    const a = music.analysis;
    return {
      origin: "audio-analysis",
      bpm: a.bpm,
      energy: a.energy,
      brightness: a.brightness,
      percussiveness: a.percussiveness,
      mode: a.mode,
      key: a.key,
      genre: null,
      mood: null,
      envelope: a.envelope,
    };
  }

  if (music.analysis) {
    const a = music.analysis;
    return {
      origin: "preview-analysis",
      bpm: a.bpm,
      energy: a.energy,
      brightness: a.brightness,
      percussiveness: a.percussiveness,
      mode: a.mode,
      key: a.key,
      genre: null,
      mood: null,
      envelope: a.envelope,
    };
  }

  const feel = music.feel;
  const bpm = feel?.bpm ?? Math.round(72 + text.arousal * 60);
  const energy = feel ? feel.energy : 0.3 + text.arousal * 0.5;
  const mode = feel && feel.mode !== "unknown" ? feel.mode : "unknown";
  const origin: MusicProfile["origin"] = feel?.bpm || (feel && feel.mode !== "unknown") ? "creator-tapped" : "default";

  return {
    origin,
    bpm: Math.round(Math.min(190, Math.max(50, bpm))),
    energy: clamp(energy),
    brightness: clamp(0.3 + energy * 0.4 + (mode === "major" ? 0.1 : mode === "minor" ? -0.1 : 0)),
    percussiveness: clamp(energy * 0.8),
    mode,
    key: null,
    genre: null,
    mood: null,
    envelope: syntheticEnvelope(bpm, energy),
  };
}

function syntheticEnvelope(bpm: number, energy: number): number[] {
  return Array.from({ length: 64 }, (_, i) => {
    const t = i / 63;
    const swell = 0.45 + 0.4 * Math.sin(Math.PI * t) ** 0.8;
    const ripple = 0.12 * energy * Math.sin(i * (bpm / 30));
    return Math.round(Math.min(1, Math.max(0.05, swell * (0.6 + energy * 0.4) + ripple)) * 100) / 100;
  });
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
