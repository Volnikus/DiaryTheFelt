import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { analyzePixels, downsample } from "../analysis/image";
import { analyzeSamples, parseWav } from "../analysis/audio";
import { DEMO_DAYS } from "../demo";
import type { Entry, PhotoInput } from "../types";
import { repo } from "./db";
import { developEntry } from "./develop";
import { DEMO_OWNER } from "./owner-token";

const DEMO_VERSION = "2";
let seeding: Promise<void> | null = null;

export function ensureDemos(): Promise<void> {
  seeding ??= (async () => {
    const ids = DEMO_DAYS.map((d) => demoId(d.id));
    if (!(await repo.hasDemos(ids))) {
      for (const d of DEMO_DAYS) await developDemo(d);
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

async function developDemo(d: (typeof DEMO_DAYS)[number]) {
  const photos: PhotoInput[] = [];
  for (const p of d.photos) {
    const buf = await fs.readFile(publicFile(p.src));
    const img = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 256 });
    const small = downsample(img.data, img.width, img.height, 128);
    photos.push({
      media: { key: `demo${p.src}`, url: p.src, contentType: "image/jpeg", size: buf.length },
      width: img.width,
      height: img.height,
      analysis: analyzePixels(small.data, small.w, small.h, { width: img.width, height: img.height }),
      credit: { author: p.author, source: p.source, license: "CC0 (Unsplash via Wikimedia Commons)" },
    });
  }
  const wav = await fs.readFile(publicFile(d.song.src));
  const { samples, sampleRate } = parseWav(new Uint8Array(wav));
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
        media: { key: `demo${d.song.src}`, url: d.song.src, contentType: "audio/wav", size: wav.length },
        name: d.song.name,
        analysis: analyzeSamples(samples, sampleRate),
      },
      narration: null,
    },
  );
  entry.generation.notes = ["Demonstration day: fictional entry, CC0 photographs, music composed for this project."];
  await repo.save(entry);
}
