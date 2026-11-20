export type TimeOfDay =
  | "dawn"
  | "morning"
  | "afternoon"
  | "golden-hour"
  | "evening"
  | "night"
  | "late-night"
  | "unknown";
export type Season = "spring" | "summer" | "autumn" | "winter" | "unknown";
export type Pacing = "still" | "flowing" | "driving" | "restless";
export type Setting = "indoor" | "outdoor" | "mixed" | "unknown";

export interface TextAnalysis {
  source: "local";
  summary: string;
  events: string[];
  atmosphere: string;
  valence: number;
  arousal: number;
  nostalgia: number;
  tension: number;
  togetherness: number;
  warmth: number;
  intensity: number;
  pacing: Pacing;
  timeOfDay: TimeOfDay;
  season: Season;
  setting: Setting;
  weather: string[];
  motifs: string[];
  feelings: string[];
  title: string;
  atmosphereLine: string;
  photoNotes: { index: number; subject: string; mood: string }[];
}

export interface ImageAnalysis {
  width: number;
  height: number;
  palette: { hex: string; weight: number }[];
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  lighting: "low-key" | "high-key" | "balanced" | "backlit";
  focusX: number;
  focusY: number;
  detail: number;
  symmetry: number;
}

export interface AudioAnalysis {
  duration: number;
  bpm: number;
  bpmConfidence: number;
  energy: number;
  dynamics: number;
  brightness: number;
  percussiveness: number;
  key: string;
  mode: "major" | "minor";
  modeConfidence: number;
  envelope: number[];
}

export type MusicProvider = "spotify" | "youtube" | "soundcloud" | "apple" | "bandcamp" | "other";

export interface MusicFeel {
  bpm: number | null;
  energy: number;
  mode: "major" | "minor" | "unknown";
}

export type MusicInput =
  | {
      kind: "file";
      media: MediaRef;
      name: string;
      analysis: AudioAnalysis;
    }
  | {
      kind: "link";
      url: string;
      provider: MusicProvider;
      embedUrl: string | null;
      title: string | null;
      artist: string | null;
      thumbnail: string | null;
      feel: MusicFeel | null;
    };

export interface MediaRef {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export interface PhotoInput {
  media: MediaRef;
  width: number;
  height: number;
  analysis: ImageAnalysis;
  credit?: { author: string; source: string; license: string };
}

export interface MusicProfile {
  origin: "audio-analysis" | "creator-tapped" | "default";
  bpm: number;
  energy: number;
  brightness: number;
  percussiveness: number;
  mode: "major" | "minor" | "unknown";
  key: string | null;
  genre: string | null;
  mood: string | null;
  envelope: number[];
}

export type Treatment = "film" | "editorial" | "collage" | "minimal" | "abstract";
export type Field = "drift" | "bokeh" | "grid" | "pulse" | "rays" | "rain";
export type Transition = "dissolve" | "drift" | "cut" | "shutter" | "slide";

export interface Palette {
  ground: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  glow: string;
  swatches: string[];
  dark: boolean;
}

export interface MemoryDesign {
  version: 1;
  seed: number;
  treatment: Treatment;
  treatmentScores: Record<Treatment, number>;
  palette: Palette;
  type: {
    family: "serif" | "grotesk" | "mono";
    italic: boolean;
    weight: number;
    width: number;
    tracking: number;
    uppercase: boolean;
    scale: number;
  };
  composition: {
    density: number;
    asymmetry: number;
    tilt: number;
    scaleContrast: number;
    focusX: number;
    focusY: number;
  };
  image: {
    filter: string;
    duotone: boolean;
    frame: "none" | "print" | "film" | "hairline" | "tape";
    vignette: number;
  };
  texture: { grain: number; paper: number; scanlines: number; leak: number };
  light: {
    angle: number;
    intensity: number;
    mode: "diffuse" | "golden" | "neon" | "hard" | "cold";
  };
  motion: {
    bpm: number;
    beatMs: number;
    beatsPerCut: number;
    transition: Transition;
    easing: string;
    energy: number;
  };
  field: { kind: Field; density: number; speed: number; weight: number };
  ornaments: string[];
  explanations: { input: string; decision: string; group: "text" | "image" | "music" }[];
}

export interface Entry {
  id: string;
  owner: string;
  demo: boolean;
  day: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  titleLocked: boolean;
  text: string;
  photos: PhotoInput[];
  music: MusicInput;
  narration: MediaRef | null;
  analysis: TextAnalysis;
  musicProfile: MusicProfile;
  design: MemoryDesign;
  generation: {
    engine: string;
    durationMs: number;
    notes: string[];
  };
}

export type EntrySummary = Pick<
  Entry,
  "id" | "demo" | "day" | "title" | "createdAt" | "updatedAt"
> & {
  excerpt: string;
  atmosphere: string;
  cover: string | null;
  palette: Palette;
  treatment: Treatment;
  type: MemoryDesign["type"];
  envelope: number[];
  bpm: number;
  song: string;
  photoCount: number;
  keywords: string;
};
