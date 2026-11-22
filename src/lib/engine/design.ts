import type {
  Field, ImageAnalysis, MemoryDesign, MusicProfile, Palette, TextAnalysis, Transition, Treatment,
} from "../types.ts";
import { contrastRatio, hexToLch, hueDelta, hueWarmth, lchToHex, mixHex, type LCH } from "../color.ts";
import { mulberry32 } from "./random.ts";

export const ENGINE_VERSION = "felt-engine/1.0";

interface Inputs {
  text: TextAnalysis;
  photos: ImageAnalysis[];
  music: MusicProfile;
  seed: number;
}

type Explain = MemoryDesign["explanations"];

const TREATMENT_NAMES: Record<Treatment, string> = {
  film: "film memory", editorial: "editorial spread", collage: "layered collage", minimal: "quiet minimal", abstract: "abstract signal",
};

export function aggregatePhotos(photos: ImageAnalysis[]) {
  const n = Math.max(1, photos.length);
  const avg = (f: (p: ImageAnalysis) => number, d: number) => (photos.length ? photos.reduce((s, p) => s + f(p), 0) / n : d);
  const swatches = new Map<string, number>();
  photos.forEach((p) => p.palette.forEach((s) => swatches.set(s.hex, (swatches.get(s.hex) ?? 0) + s.weight / n)));
  const lightingVotes = new Map<string, number>();
  photos.forEach((p) => lightingVotes.set(p.lighting, (lightingVotes.get(p.lighting) ?? 0) + 1));
  return {
    count: photos.length,
    brightness: avg((p) => p.brightness, 0.5),
    contrast: avg((p) => p.contrast, 0.5),
    saturation: avg((p) => p.saturation, 0.4),
    warmth: avg((p) => p.warmth, 0),
    detail: avg((p) => p.detail, 0.4),
    symmetry: avg((p) => p.symmetry, 0.5),
    focusX: avg((p) => p.focusX, 0.5),
    focusY: avg((p) => p.focusY, 0.45),
    lighting: [...lightingVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "balanced",
    swatches: [...swatches.entries()].sort((a, b) => b[1] - a[1]).map(([hex, weight]) => ({ hex, weight })),
  };
}

export function buildDesign({ text, photos, music, seed }: Inputs): MemoryDesign {
  const rand = mulberry32(seed);
  const img = aggregatePhotos(photos);
  const explain: Explain = [];
  const say = (group: Explain[number]["group"], input: string, decision: string) => explain.push({ group, input, decision });

  const T = text;
  const musicWeight = music.origin === "default" ? 0.15 : 0.4;
  const energy = clamp(T.arousal * (0.8 - musicWeight) + music.energy * musicWeight + music.percussiveness * 0.2);
  const calm = 1 - energy;
  const night = { "late-night": 0.65, night: 0.55, evening: 0.3, "golden-hour": 0.12, afternoon: -0.1, morning: -0.2, dawn: 0, unknown: 0 }[T.timeOfDay];
  const darkness = clamp(0.25 + night + (0.5 - img.brightness) * 0.6 + (music.mode === "minor" ? 0.1 : 0) + T.tension * 0.15 - Math.max(0, T.valence) * 0.15);
  const dark = darkness > 0.5;
  const techMotif = T.motifs.some((m) => ["Code", "Screens", "Deadline", "Messages"].includes(m));
  const coldSeason = T.season === "autumn" || T.season === "winter";
  const fade = T.nostalgia * (1 - 0.8 * Math.max(0, T.valence) * energy);

  const scores: Record<Treatment, number> = {
    film:
      1.1 * T.nostalgia + (coldSeason ? 0.3 : 0) + 0.3 * calm + 0.2 * Math.max(0, img.warmth) +
      (["golden-hour", "evening"].includes(T.timeOfDay) ? 0.15 : 0) - 0.35 * T.tension - 0.2 * Math.max(0, energy - 0.6),
    editorial:
      0.55 + (img.count <= 2 ? 0.25 : 0) + 0.2 * (1 - Math.abs(T.valence)) + 0.15 * img.symmetry - 0.15 * T.intensity,
    collage:
      0.6 * T.togetherness + 0.5 * Math.min(1, (img.count - 1) / 3) + 0.45 * energy + 0.35 * Math.max(0, T.valence) - 0.35 * T.tension,
    minimal:
      0.75 * calm + 0.4 * (1 - T.togetherness) + (img.count <= 1 ? 0.3 : 0) + 0.2 * (1 - img.detail) - 0.35 * T.nostalgia - 0.2 * T.intensity,
    abstract:
      0.95 * T.tension + (["night", "late-night"].includes(T.timeOfDay) ? 0.35 : 0) + 0.4 * music.percussiveness * music.energy +
      (music.mode === "minor" ? 0.2 : 0) + (T.setting === "indoor" ? 0.15 : 0) + (techMotif ? 0.25 : 0) - 0.3 * Math.max(0, T.valence),
  };
  const ranked = (Object.entries(scores) as [Treatment, number][]).sort((a, b) => b[1] - a[1]);
  const treatment = ranked[0][0];
  say("text", describeDims(T), `Composed as ${treatment === "abstract" ? "an" : "a"} ${TREATMENT_NAMES[treatment]} (strongest fit ${ranked[0][1].toFixed(2)}, next: ${TREATMENT_NAMES[ranked[1][0]]} ${ranked[1][1].toFixed(2)})`);

  const palette = buildPalette({ T, img, music, energy, dark, darkness }, say);

  let family: MemoryDesign["type"]["family"] = "serif";
  if (T.tension > 0.6 || (treatment === "abstract" && techMotif)) family = "mono";
  else if (energy > 0.6 && T.valence > 0.15) family = "grotesk";
  else if (treatment === "minimal" && T.nostalgia < 0.3) family = "grotesk";
  const type: MemoryDesign["type"] = {
    family,
    italic: false,
    weight: family === "serif" ? 400 : Math.round(300 + 550 * energy),
    width: family === "grotesk" ? Math.round(clamp((energy - 0.3) / 0.7) * 50 + 75) : family === "mono" ? 100 : 100,
    tracking: family === "mono" ? 0.04 + T.tension * 0.06 : family === "grotesk" ? -0.03 + (1 - energy) * 0.03 : -0.015,
    uppercase: family === "mono" || (family === "grotesk" && energy > 0.75),
    scale: round(0.88 + T.intensity * 0.35 + (treatment === "minimal" ? -0.1 : 0)),
  };
  say(
    "text",
    family === "mono" ? `Pressure and focus (tension ${pct(T.tension)})` : family === "grotesk" ? `Momentum (energy ${pct(energy)}, lightness ${signed(T.valence)})` : `Reflective tone (nostalgia ${pct(T.nostalgia)}, calm ${pct(calm)})`,
    family === "mono"
      ? "Monospaced uppercase type — the language of terminals and timestamps"
      : family === "grotesk"
        ? `Heavy display type at weight ${type.weight}, set tight and loud`
        : "Light, airy display type, set close and quiet",
  );

  const composition: MemoryDesign["composition"] = {
    density: round(clamp(0.25 + 0.5 * energy + 0.2 * Math.min(1, img.count / 5))),
    asymmetry: round(clamp(0.25 + 0.45 * (1 - img.symmetry) + 0.3 * energy)),
    tilt: round(treatment === "collage" ? 2 + 5 * energy : treatment === "film" ? 1.2 : 0),
    scaleContrast: round(clamp(0.3 + 0.6 * T.intensity)),
    focusX: round(img.focusX),
    focusY: round(img.focusY),
  };
  if (photos.length) {
    say("image", `Visual weight sits at ${pct(img.focusX)} across, ${pct(img.focusY)} down`, `Title and light are placed to answer the photographs' own centre of gravity`);
  }

  const filters: string[] = [];
  if (fade > 0.3) filters.push(`sepia(${round(0.3 * fade)})`, `saturate(${round(1 - 0.35 * fade)})`, `contrast(${round(0.94)})`, `brightness(1.03)`);
  if (T.tension > 0.45) filters.push(`grayscale(${round(0.45 * T.tension)})`, `contrast(${round(1 + 0.25 * T.tension)})`, `brightness(0.92)`);
  if (T.valence > 0.3 && energy > 0.5) filters.push(`saturate(${round(1.08 + 0.2 * energy)})`, `contrast(1.05)`);
  if (!filters.length) filters.push("saturate(0.96)");
  const image: MemoryDesign["image"] = {
    filter: filters.join(" "),
    duotone: treatment === "abstract",
    frame: treatment === "film" ? "film" : treatment === "collage" ? "tape" : treatment === "editorial" ? "hairline" : "none",
    vignette: round(clamp(0.15 + 0.45 * fade + 0.3 * darkness)),
  };
  say(
    "image",
    photos.length ? `${photos.length} photograph${photos.length > 1 ? "s" : ""}: brightness ${pct(img.brightness)}, saturation ${pct(img.saturation)}, ${img.lighting} light` : "No photographs analysed",
    fade > 0.3
      ? "Photographs are faded and warmed like prints that have been looked at often"
      : T.tension > 0.45
        ? "Photographs are drained toward monochrome with hard contrast"
        : "Photographs keep their colour, lifted slightly",
  );

  const texture = {
    grain: round(clamp(0.12 + 0.5 * fade + 0.15 * darkness)),
    paper: round(dark ? 0 : clamp(0.2 + 0.5 * fade)),
    scanlines: round(treatment === "abstract" ? 0.2 + 0.4 * T.tension : 0),
    leak: round(treatment === "film" ? 0.25 + 0.4 * T.warmth : treatment === "collage" && T.valence > 0.3 ? 0.25 : 0),
  };
  const lightMode: MemoryDesign["light"]["mode"] =
    ["golden-hour", "evening"].includes(T.timeOfDay) && T.warmth > 0.4 ? "golden"
      : dark && (T.tension > 0.4 || energy > 0.6) ? "neon"
        : T.season === "winter" || (T.warmth < 0.35 && img.warmth < 0) ? "cold"
          : energy > 0.65 && !dark ? "hard"
            : T.season === "summer" && T.valence > 0.3 ? "golden" : "diffuse";
  const timeAngle = { dawn: 100, morning: 120, afternoon: 180, "golden-hour": 250, evening: 260, night: 200, "late-night": 200, unknown: 160 }[T.timeOfDay];
  const light = {
    angle: Math.round(timeAngle + (img.focusX - 0.5) * 60),
    intensity: round(clamp(0.35 + 0.4 * (lightMode === "neon" || lightMode === "hard" ? energy : 1 - darkness * 0.5))),
    mode: lightMode,
  };
  say("text", `${labelTime(T.timeOfDay)}${T.season !== "unknown" ? `, ${T.season}` : ""}${T.weather.length ? `, ${T.weather.join(" & ")}` : ""}`, `${cap(lightMode)} light falling from ${light.angle}°, grain at ${pct(texture.grain)}`);

  const bpm = music.bpm;
  const beatMs = Math.round(60000 / bpm);
  const targetSeconds = 3.8 - 2.6 * energy;
  const beatsPerCut = [1, 2, 4, 8].reduce((best, b) => (Math.abs((b * beatMs) / 1000 - targetSeconds) < Math.abs((best * beatMs) / 1000 - targetSeconds) ? b : best), 4);
  const transition: Transition =
    treatment === "film" ? "dissolve"
      : treatment === "minimal" ? "drift"
        : treatment === "abstract" ? (music.percussiveness > 0.5 ? "cut" : "shutter")
          : treatment === "collage" ? "slide"
            : energy > 0.55 ? "shutter" : "dissolve";
  const motion = {
    bpm,
    beatMs,
    beatsPerCut,
    transition,
    easing: energy > 0.55 ? "cubic-bezier(0.7, 0, 0.2, 1)" : "cubic-bezier(0.22, 0.61, 0.36, 1)",
    energy: round(energy),
  };
  say(
    "music",
    `${music.origin === "audio-analysis" || music.origin === "preview-analysis" ? "Measured" : music.origin === "creator-tapped" ? "Tapped" : "Assumed"} ${bpm} BPM, ${music.mode === "unknown" ? "mode unknown" : music.mode}${music.key ? ` (${music.key})` : ""}, energy ${pct(music.energy)}`,
    `Reel cuts every ${beatsPerCut} beat${beatsPerCut > 1 ? "s" : ""} (${((beatsPerCut * beatMs) / 1000).toFixed(1)} s) with ${transition} transitions; the generative layer breathes on the beat`,
  );

  const has = (...labels: string[]) => T.motifs.some((m) => labels.includes(m));
  const fieldScores: Record<Field, number> = {
    drift: (T.season === "autumn" ? 0.6 : 0) + (has("Leaves", "Trees", "Snow", "Flowers") ? 0.6 : 0) + calm * 0.4,
    bokeh: (has("Lamplight", "City", "Candles", "Stars", "Moon") ? 0.5 : 0) + (dark ? 0.3 : 0) + T.nostalgia * 0.3 + T.warmth * 0.2,
    grid: (techMotif ? 0.8 : 0) + T.tension * 0.7 + (music.percussiveness > 0.6 ? 0.2 : 0),
    pulse: (has("Sea", "Shore", "Water", "Swimming", "Music", "Dancing") ? 0.6 : 0) + energy * 0.3 + music.energy * 0.2,
    rays: (has("Sunlight", "Sunset", "Dawn", "Meadow") ? 0.6 : 0) + (T.season === "summer" ? 0.3 : 0) + Math.max(0, T.valence) * 0.4,
    rain: (has("Rain") ? 1.2 : 0) + (T.weather.includes("rain") ? 0.4 : 0),
  };
  const fieldKind = (Object.entries(fieldScores) as [Field, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const field = {
    kind: fieldKind,
    density: round(clamp(0.3 + 0.5 * energy + rand() * 0.1)),
    speed: round(0.4 + energy * 1.2),
    weight: round(1 + T.intensity * 1.5),
  };
  say("text", T.motifs.length ? `Motifs: ${T.motifs.slice(0, 4).join(", ")}` : "No strong motifs", `Generative layer: ${FIELD_NAMES[fieldKind]}`);

  const ornaments: string[] = ["waveform"];
  if (treatment === "film") ornaments.push("date-stamp", "frame-numbers");
  if (treatment === "abstract") ornaments.push("timecode", "registration");
  if (treatment === "editorial") ornaments.push("folio", "registration");
  if (treatment === "collage") ornaments.push("tape", "stickers");
  if (treatment === "minimal") ornaments.push("folio");
  if (fieldKind === "rays") ornaments.push("sun");

  return {
    version: 1,
    seed,
    treatment,
    treatmentScores: Object.fromEntries(ranked.map(([k, v]) => [k, round(v)])) as Record<Treatment, number>,
    palette,
    type,
    composition,
    image,
    texture,
    light,
    motion,
    field,
    ornaments,
    explanations: explain,
  };
}

const FIELD_NAMES: Record<Field, string> = {
  drift: "slow drifting fragments, like leaves or snow",
  bokeh: "soft out-of-focus lights",
  grid: "a scanning geometric grid that ticks with the beat",
  pulse: "concentric pulses rippling outward on each beat",
  rays: "radiating light from a low sun",
  rain: "falling streaks of rain",
};

function buildPalette(
  ctx: { T: TextAnalysis; img: ReturnType<typeof aggregatePhotos>; music: MusicProfile; energy: number; dark: boolean; darkness: number },
  say: (g: "text" | "image" | "music", i: string, d: string) => void,
): Palette {
  const { T, img, music, energy, dark } = ctx;
  const fallbackHue = T.warmth > 0.5 ? 50 : T.tension > 0.5 ? 250 : 200;
  let swatches: LCH[] = img.swatches.slice(0, 8).map((s) => hexToLch(s.hex));
  if (!swatches.length) swatches = [{ l: 0.6, c: 0.08, h: fallbackHue }, { l: 0.4, c: 0.05, h: fallbackHue + 40 }];

  const chromaScale = (1 - 0.45 * T.nostalgia) * (1 - 0.35 * T.tension) * (1 + 0.55 * Math.max(0, T.valence) * energy);
  const warmShift = 14 * T.nostalgia + 10 * (T.warmth - 0.5) - 18 * T.tension;
  const moved = swatches.map((s) => ({
    l: s.l,
    c: s.c * chromaScale,
    h: (s.h + Math.sign(hueDelta(s.h, warmShift >= 0 ? 60 : 245)) * Math.min(Math.abs(warmShift), Math.abs(hueDelta(s.h, warmShift >= 0 ? 60 : 245))) + 360) % 360,
  }));

  const accentBase = [...moved].sort((a, b) => b.c * (0.6 + b.l) - a.c * (0.6 + a.l))[0];
  const dominant = moved[0];
  const groundHue = dark ? (T.tension > 0.5 ? 255 : dominant.h) : (moved.find((s) => hueWarmth(s.h) > 0)?.h ?? 70);

  const ground = lchToHex(dark
    ? { l: 0.13 + (1 - ctx.darkness) * 0.06, c: 0.012 + 0.02 * (1 - T.tension), h: groundHue }
    : { l: 0.955 - 0.03 * T.nostalgia, c: 0.012 + 0.025 * T.warmth, h: groundHue });
  const surface = lchToHex(dark
    ? { l: 0.2 + (1 - ctx.darkness) * 0.05, c: 0.02, h: groundHue }
    : { l: 0.91 - 0.03 * T.nostalgia, c: 0.018 + 0.02 * T.warmth, h: groundHue });

  const accentChroma = clamp(0.06 + 0.14 * energy + 0.06 * Math.max(0, T.valence) - 0.05 * T.nostalgia, 0.04, 0.22);
  const accentL = dark ? 0.72 + 0.08 * energy : 0.56 - 0.05 * T.tension;
  const accent = lchToHex({ l: accentL, c: Math.max(accentChroma, accentBase.c * 0.9), h: accentBase.h });
  const spread = energy > 0.55 && music.mode !== "minor" ? 150 + 40 * energy : music.mode === "minor" ? -35 : 30;
  const accent2 = lchToHex({ l: accentL + (dark ? -0.05 : 0.08), c: accentChroma * (music.mode === "minor" ? 0.6 : 0.85), h: (accentBase.h + spread + 360) % 360 });

  let ink = lchToHex(dark ? { l: 0.95, c: 0.015, h: groundHue } : { l: 0.2, c: 0.02, h: groundHue });
  if (contrastRatio(ink, ground) < 7) ink = dark ? "#f7f3ec" : "#141210";
  let muted = mixHex(ink, ground, 0.42);
  if (contrastRatio(muted, ground) < 3.6) muted = mixHex(ink, ground, 0.3);

  const glow = T.timeOfDay === "golden-hour" || (T.warmth > 0.6 && !dark)
    ? lchToHex({ l: 0.86, c: 0.12, h: 75 })
    : dark ? lchToHex({ l: 0.7, c: Math.min(0.2, accentChroma * 1.3), h: accentBase.h })
      : lchToHex({ l: 0.92, c: 0.05, h: accentBase.h });

  const finalSwatches = moved.slice(0, 6).map((s) => lchToHex(s));
  say(
    "image",
    img.count ? `Photograph colours ${img.swatches.slice(0, 4).map((s) => s.hex).join(" ")}` : "No photograph colours",
    `Palette ${dark ? "set on a dark ground" : "set on a pale ground"}, chroma ×${chromaScale.toFixed(2)}, hues ${warmShift >= 0 ? "warmed" : "cooled"} by up to ${Math.abs(Math.round(warmShift))}°`,
  );
  say(
    "music",
    `${music.mode === "unknown" ? "Unknown mode" : `${cap(music.mode)} key`}, brightness ${pct(music.brightness)}`,
    music.mode === "minor" ? "Second colour sits close to the first and muted — a minor-key restraint" : energy > 0.55 ? "Second colour is set across the wheel for a vivid, major-key contrast" : "Second colour stays a near neighbour, gentle and analogous",
  );

  return { ground, surface, ink, muted, accent, accent2, glow, swatches: finalSwatches, dark };
}

function describeDims(t: TextAnalysis) {
  return `Entry reads ${t.feelings.slice(0, 3).join(", ")} — nostalgia ${pct(t.nostalgia)}, tension ${pct(t.tension)}, togetherness ${pct(t.togetherness)}`;
}

function labelTime(t: TextAnalysis["timeOfDay"]) {
  return t === "unknown" ? "Unspecified time" : cap(t.replace("-", " "));
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 1000) / 1000;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
