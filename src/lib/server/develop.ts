import "server-only";
import { z } from "zod/v4";
import type { Entry, MediaRef, MusicInput, PhotoInput } from "../types";
import { analyzeTextLocally } from "../analysis/text";
import { buildDesign, ENGINE_VERSION } from "../engine/design";
import { toMusicProfile } from "../engine/music";
import { hashString } from "../engine/random";
import { parseMusicLink } from "../music-link";
import { mediaUrl, ownsKey } from "./storage";
import { aiMemoryWords } from "./ai";

const unit = z.number().min(0).max(1);
const MediaIn = z.object({ key: z.string().min(1).max(300), contentType: z.string().max(100), size: z.number().int().nonnegative() });

const ImageAnalysisIn = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  palette: z.array(z.object({ hex: z.string().regex(/^#[0-9a-f]{6}$/i), weight: unit })).min(1).max(8),
  brightness: unit, contrast: unit, saturation: unit,
  warmth: z.number().min(-1).max(1),
  lighting: z.enum(["low-key", "high-key", "balanced", "backlit"]),
  focusX: unit, focusY: unit, detail: unit, symmetry: unit,
});

const AudioAnalysisIn = z.object({
  duration: z.number().nonnegative(),
  bpm: z.number().min(30).max(250),
  bpmConfidence: unit, energy: unit, dynamics: unit, brightness: unit, percussiveness: unit,
  key: z.string().max(12),
  mode: z.enum(["major", "minor"]),
  modeConfidence: unit,
  envelope: z.array(unit).length(64),
});

export const EntryInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().trim().min(12, "Write a few sentences about the day").max(8000),
  title: z.string().trim().max(80).nullable().optional(),
  photos: z.array(z.object({ media: MediaIn, analysis: ImageAnalysisIn })).min(1, "Add at least one photograph").max(12),
  music: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("file"), media: MediaIn, name: z.string().max(200), analysis: AudioAnalysisIn }),
    z.object({
      kind: z.literal("link"),
      url: z.string().url().max(600),
      analysis: AudioAnalysisIn.nullable().optional(),
      title: z.string().max(200).nullable().optional(),
      artist: z.string().max(200).nullable().optional(),
      feel: z.object({ bpm: z.number().min(40).max(220).nullable(), energy: unit, mode: z.enum(["major", "minor", "unknown"]) }).nullable().optional(),
    }),
  ]),
  narration: MediaIn.nullable().optional(),
});
export type EntryInputT = z.infer<typeof EntryInput>;

export class InputError extends Error {}

const toRef = (m: z.infer<typeof MediaIn>): MediaRef => ({ key: m.key, url: mediaUrl(m.key), contentType: m.contentType, size: m.size });

export async function resolveLink(url: string): Promise<Extract<MusicInput, { kind: "link" }>> {
  const parsed = parseMusicLink(url);
  if (!parsed) throw new InputError("That music link could not be recognised");
  let title: string | null = null, artist: string | null = null, thumbnail: string | null = null;
  if (parsed.oembed) {
    try {
      const res = await fetch(parsed.oembed, { signal: AbortSignal.timeout(4000), headers: { accept: "application/json" } });
      if (res.ok) {
        const j = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        title = j.title?.slice(0, 200) ?? null;
        artist = j.author_name?.slice(0, 200) ?? null;
        thumbnail = j.thumbnail_url && /^https:\/\//.test(j.thumbnail_url) ? j.thumbnail_url : null;
      }
    } catch {
    }
  }
  return { kind: "link", url: parsed.url, provider: parsed.provider, embedUrl: parsed.embedUrl, title, artist, thumbnail, feel: null };
}

interface DevelopOptions {
  id: string;
  owner: string;
  demo?: boolean;
  createdAt?: string;
  previous?: Entry | null;
  photos?: PhotoInput[];
  music?: MusicInput;
  narration?: MediaRef | null;
}

export async function developEntry(input: EntryInputT, opts: DevelopOptions): Promise<Entry> {
  const started = Date.now();
  const notes: string[] = [];

  const photos: PhotoInput[] = opts.photos ?? input.photos.map((p) => {
    if (!ownsKey(opts.owner, p.media.key)) throw new InputError("A photograph does not belong to this diary");
    return { media: toRef(p.media), width: p.analysis.width, height: p.analysis.height, analysis: p.analysis };
  });

  let music: MusicInput;
  if (opts.music) music = opts.music;
  else if (input.music.kind === "file") {
    if (!ownsKey(opts.owner, input.music.media.key)) throw new InputError("The audio file does not belong to this diary");
    music = { kind: "file", media: toRef(input.music.media), name: input.music.name || "Untitled track", analysis: input.music.analysis };
  } else {
    const prev = opts.previous?.music;
    music = prev?.kind === "link" && prev.url === input.music.url ? { ...prev } : await resolveLink(input.music.url);
    music.feel = input.music.feel ?? null;
    if (input.music.analysis) music.analysis = input.music.analysis;
    music.title ??= input.music.title ?? null;
    music.artist ??= input.music.artist ?? null;
  }

  let narration: MediaRef | null = opts.narration ?? null;
  if (!opts.narration && input.narration) {
    if (!ownsKey(opts.owner, input.narration.key)) throw new InputError("The narration does not belong to this diary");
    narration = toRef(input.narration);
  }

  const analysis = analyzeTextLocally(input.text);

  const musicProfile = toMusicProfile(music, analysis);
  if (music.kind === "link" && musicProfile.origin === "default") {
    notes.push("The linked song could not be analysed directly; tap its tempo when creating to let it shape the motion.");
  }
  const design = buildDesign({ text: analysis, photos: photos.map((p) => p.analysis), music: musicProfile, seed: hashString(opts.id + input.text) });

  const now = new Date().toISOString();
  const manualTitle = input.title?.trim();
  const keepLocked = opts.previous?.titleLocked && !input.title;
  // With AI configured, real entries get an AI-written title (unless the writer chose one) and atmosphere line.
  // Demos, AI being off, and any failure keep Felt's own title and line.
  if (!opts.demo) {
    const words = await aiMemoryWords(input.text);
    if (words.title && !manualTitle && !keepLocked) {
      analysis.title = words.title;
      notes.push("The title was written by AI from your words.");
    }
    if (words.line) {
      analysis.atmosphereLine = words.line;
      notes.push("The atmosphere line was written by AI from your words.");
    }
  }
  return {
    id: opts.id,
    owner: opts.owner,
    demo: Boolean(opts.demo),
    day: input.day,
    createdAt: opts.previous?.createdAt ?? opts.createdAt ?? now,
    updatedAt: now,
    title: manualTitle || (keepLocked ? opts.previous!.title : analysis.title),
    titleLocked: Boolean(manualTitle) || Boolean(keepLocked),
    text: input.text,
    photos,
    music,
    narration,
    analysis,
    musicProfile,
    design,
    generation: {
      engine: ENGINE_VERSION,
      durationMs: Date.now() - started,
      notes,
    },
  };
}

export function newEntryId() {
  return `${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function mediaKeys(e: Entry): string[] {
  const keys = e.photos.map((p) => p.media.key);
  if (e.music.kind === "file") keys.push(e.music.media.key);
  if (e.narration) keys.push(e.narration.key);
  return keys.filter((k) => k.startsWith("u/"));
}
