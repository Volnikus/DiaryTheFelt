import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeSamples } from "../analysis/audio.ts";
import { analyzePixels } from "../analysis/image.ts";
import { analyzeTextLocally } from "../analysis/text.ts";
import { buildDesign } from "../engine/design.ts";
import { toMusicProfile } from "../engine/music.ts";
import { parseMusicLink } from "../music-link.ts";
import { buildZip } from "../server/zip.ts";
import type { ImageAnalysis, MusicInput } from "../types.ts";

function clickTrack(bpm: number, seconds = 30, rate = 22050) {
  const out = new Float32Array(seconds * rate);
  const period = Math.round((60 / bpm) * rate);
  for (let start = 0; start < out.length; start += period) {
    for (let i = 0; i < 1500 && start + i < out.length; i++) out[start + i] = Math.sin(i * 0.3) * Math.exp(-i / 300);
  }
  return { samples: out, rate };
}

function flatImage(r: number, g: number, b: number, w = 32, h = 24): ImageAnalysis {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([r, g, b, 255], i * 4);
  return analyzePixels(data, w, h);
}

const fileMusic = (bpm: number, energy: number, mode: "major" | "minor"): MusicInput => ({
  kind: "file",
  media: { key: "k", url: "/x", contentType: "audio/wav", size: 1 },
  name: "t",
  analysis: { duration: 30, bpm, bpmConfidence: 1, energy, dynamics: 0.3, brightness: 0.3, percussiveness: energy, key: "A minor", mode, modeConfidence: 0.5, envelope: new Array(64).fill(0.5) },
});

test("tempo is measured from the audio signal", () => {
  for (const bpm of [90, 120, 140]) {
    const { samples, rate } = clickTrack(bpm);
    const a = analyzeSamples(samples, rate);
    assert.ok(Math.abs(a.bpm - bpm) <= 3 || Math.abs(a.bpm * 2 - bpm) <= 3, `expected ~${bpm}, got ${a.bpm}`);
    assert.equal(a.envelope.length, 64);
  }
});

test("image analysis reads colour temperature and brightness", () => {
  const warm = flatImage(230, 140, 60);
  const cool = flatImage(40, 80, 160);
  assert.ok(warm.warmth > 0.3 && cool.warmth < -0.3);
  assert.ok(warm.brightness > cool.brightness);
  assert.equal(warm.palette[0].hex.length, 7);
});

test("titles are 3–7 words and deterministic", () => {
  const text = "We walked through the autumn park with friends, drinking hot tea while the leaves fell. We talked for hours.";
  const a = analyzeTextLocally(text);
  const b = analyzeTextLocally(text);
  assert.equal(a.title, b.title);
  const words = a.title.split(/\s+/).length;
  assert.ok(words >= 3 && words <= 7, a.title);
});

test("different days develop into different treatments", () => {
  const calm = analyzeTextLocally("A slow autumn afternoon. I remembered the old house and the summers we spent there, warm tea in my hands, wistful and quiet.");
  const tense = analyzeTextLocally("Deadline at 9am. Debugging code past midnight, 3am, stress, focus, the terminal and the screen, rushing to submit.");
  const joy = analyzeTextLocally("Summer! We danced and laughed with friends at the beach, swam in the sea, sunlight everywhere, so happy and free!");
  const design = (t: typeof calm, img: ImageAnalysis, m: MusicInput, seed = 1) => buildDesign({ text: t, photos: [img, img, img], music: toMusicProfile(m, t), seed });
  const d1 = design(calm, flatImage(200, 150, 100), fileMusic(72, 0.3, "major"));
  const d2 = design(tense, flatImage(30, 40, 60), fileMusic(128, 0.85, "minor"));
  const d3 = design(joy, flatImage(240, 200, 120), fileMusic(118, 0.8, "major"));
  assert.equal(d1.treatment, "film");
  assert.equal(d2.treatment, "abstract");
  assert.equal(d3.treatment, "collage");
  assert.ok(d2.palette.dark && !d3.palette.dark);
  assert.ok(d2.motion.beatMs < d1.motion.beatMs, "faster music, faster motion");
  assert.deepEqual(design(calm, flatImage(200, 150, 100), fileMusic(72, 0.3, "major")), d1, "same inputs, same memory");
  for (const d of [d1, d2, d3]) assert.ok(d.explanations.length >= 6);
});

test("music links resolve to official embeds", () => {
  assert.equal(parseMusicLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")?.embedUrl, "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
  assert.equal(parseMusicLink("https://youtu.be/dQw4w9WgXcQ")?.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(parseMusicLink("not a url"), null);
});

test("day folders are valid zip archives", () => {
  const zip = buildZip([{ name: "day/entry.txt", data: new TextEncoder().encode("hello") }]);
  const view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
});
