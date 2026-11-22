import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { analyzePixels, downsample } from "../analysis/image";
import { analyzeSamples, parseWav } from "../analysis/audio";
import { DEMO_DAYS } from "../demo";
import { MONTH_DAYS, MONTH_SONGS } from "../demo-month";
import type { AudioAnalysis, Entry, ImageAnalysis, PhotoInput } from "../types";
import { repo } from "./db";
import { developEntry } from "./develop";
import { DEMO_OWNER } from "./owner-token";

const DEMO_VERSION = "2";
let seeding: Promise<void> | null = null;

// The demonstration month (October 2026) — one page a day, reusing the showcase photos and songs.
const monthId = (day: string) => `demo-day-${day}`;
const MONTH_AS_DEMOS: (typeof DEMO_DAYS)[number][] = MONTH_DAYS.map((m) => {
  const owner = DEMO_DAYS.flatMap((d) => d.photos);
  return {
    id: monthId(m.day),
    day: m.day,
    text: m.text,
    photos: m.photos.map((src) => owner.find((p) => p.src === src) ?? { src, author: "Unsplash", source: "https://unsplash.com" }),
    song: MONTH_SONGS[m.song],
  };
});
const ALL_DEMOS = [...DEMO_DAYS, ...MONTH_AS_DEMOS];

export function ensureDemos(): Promise<void> {
  seeding ??= (async () => {
    const ids = ALL_DEMOS.map((d) => demoId(d.id));
    if (!(await repo.hasDemos(ids))) {
      const missing: (typeof ALL_DEMOS)[number][] = [];
      for (const d of ALL_DEMOS) if (!(await repo.hasDemos([demoId(d.id)]))) missing.push(d);
      // a few at a time: reading photos and songs is cached, saving is the slow part
      for (let i = 0; i < missing.length; i += 4) await Promise.all(missing.slice(i, i + 4).map(developDemo));
    }
    await repo.removeStaleDemos(ids);
  })().catch((err) => {
    seeding = null;
    console.error("Demo seeding failed", err);
  });
  return seeding;
}

const demoId = (id: string) => `${id}-v${DEMO_VERSION}`;

let demoEntries: Promise<Entry[]> | null = null;

export function getDemoEntries(): Promise<Entry[]> {
  demoEntries ??= ensureDemos()
    .then(() => Promise.all(DEMO_DAYS.map((d) => repo.get(DEMO_OWNER, demoId(d.id)))))
    .then((list) => list.filter((e): e is Entry => Boolean(e)))
    .then((list) => {
      if (list.length < DEMO_DAYS.length) demoEntries = null;
      return list;
    })
    .catch((err) => {
      demoEntries = null;
      throw err;
    });
  return demoEntries;
}
const publicFile = (src: string) => path.join(process.cwd(), "public", src);

// Photos and songs are shared between demonstration days: read and analyse each once.
const photoCache = new Map<string, Promise<{ size: number; width: number; height: number; analysis: ImageAnalysis }>>();
const songCache = new Map<string, Promise<{ size: number; analysis: AudioAnalysis }>>();

function readPhoto(src: string) {
  let p = photoCache.get(src);
  if (!p) {
    p = fs.readFile(publicFile(src)).then((buf) => {
      const img = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 256 });
      const small = downsample(img.data, img.width, img.height, 128);
      return { size: buf.length, width: img.width, height: img.height, analysis: analyzePixels(small.data, small.w, small.h, { width: img.width, height: img.height }) };
    });
    photoCache.set(src, p);
  }
  return p;
}

function readSong(src: string) {
  let p = songCache.get(src);
  if (!p) {
    p = fs.readFile(publicFile(src)).then((wav) => {
      const { samples, sampleRate } = parseWav(new Uint8Array(wav));
      return { size: wav.length, analysis: analyzeSamples(samples, sampleRate) };
    });
    songCache.set(src, p);
  }
  return p;
}

async function developDemo(d: (typeof DEMO_DAYS)[number]) {
  const photos: PhotoInput[] = [];
  for (const p of d.photos) {
    const img = await readPhoto(p.src);
    photos.push({
      media: { key: `demo${p.src}`, url: p.src, contentType: "image/jpeg", size: img.size },
      width: img.width,
      height: img.height,
      analysis: img.analysis,
      credit: { author: p.author, source: p.source, license: "CC0 (Unsplash via Wikimedia Commons)" },
    });
  }
  const song = await readSong(d.song.src);
  const id = demoId(d.id);
  const entry = await developEntry(
    { day: d.day, text: d.text, photos: [], music: { kind: "link", url: "https://example.com" } },
    {
      id,
      owner: DEMO_OWNER,
      demo: true,
      createdAt: `${d.day}T21:00:00.000Z`,
      photos,
      music: {
        kind: "file",
        media: { key: `demo${d.song.src}`, url: d.song.src, contentType: "audio/wav", size: song.size },
        name: d.song.name,
        analysis: song.analysis,
      },
      narration: null,
    },
  );
  entry.generation.notes = ["Demonstration day: fictional entry, CC0 photographs, music composed for this project."];
  await repo.save(entry);
}
