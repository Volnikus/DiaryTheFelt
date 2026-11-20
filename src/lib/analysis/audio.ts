import type { AudioAnalysis } from "../types.ts";

const TARGET_RATE = 11025;
const FRAME = 1024;
const HOP = 256;
const NOTES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export function analyzeSamples(input: Float32Array, sampleRate: number): AudioAnalysis {
  const duration = input.length / sampleRate;
  const span = Math.min(duration, 75);
  const start = Math.max(0, Math.min(duration * 0.12, duration - span));
  const factor = Math.max(1, Math.round(sampleRate / TARGET_RATE));
  const rate = sampleRate / factor;
  const from = Math.floor(start * sampleRate);
  const count = Math.floor((span * sampleRate) / factor);
  const x = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let s = 0;
    const base = from + i * factor;
    for (let j = 0; j < factor; j++) s += input[base + j] ?? 0;
    x[i] = s / factor;
  }

  const window = new Float64Array(FRAME).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));
  const frames = Math.max(0, Math.floor((count - FRAME) / HOP));
  const rms = new Float64Array(frames);
  const flux = new Float64Array(frames);
  const centroids = new Float64Array(frames);
  const chroma = new Float64Array(12);
  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  let prev = new Float64Array(FRAME / 2);
  const binHz = rate / FRAME;

  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    let e = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = x[off + i];
      e += v * v;
      re[i] = v * window[i];
      im[i] = 0;
    }
    rms[f] = Math.sqrt(e / FRAME);
    fft(re, im);
    const mag = new Float64Array(FRAME / 2);
    let num = 0, den = 0, fl = 0;
    for (let k = 1; k < FRAME / 2; k++) {
      const m = Math.hypot(re[k], im[k]);
      mag[k] = m;
      const lm = Math.log1p(m * 10);
      const d = lm - Math.log1p(prev[k] * 10);
      if (d > 0) fl += d;
      num += k * binHz * m;
      den += m;
      const hz = k * binHz;
      if (hz >= 55 && hz <= 1760) {
        const pc = (Math.round(12 * Math.log2(hz / 440)) + 9 + 1200) % 12;
        chroma[pc] += m;
      }
    }
    flux[f] = fl;
    centroids[f] = den > 0 ? num / den : 0;
    prev = mag;
  }

  const frameRate = rate / HOP;
  const { bpm, confidence } = estimateTempo(flux, frameRate);

  const db = Array.from(rms, (r) => 20 * Math.log10(r + 1e-6));
  const loud = db.filter((v) => v > -60);
  const meanDb = loud.length ? loud.reduce((a, b) => a + b, 0) / loud.length : -60;
  const stdDb = loud.length ? Math.sqrt(loud.reduce((a, b) => a + (b - meanDb) ** 2, 0) / loud.length) : 0;
  const meanCentroid = centroids.reduce((a, b) => a + b, 0) / Math.max(1, frames);

  const fluxMean = flux.reduce((a, b) => a + b, 0) / Math.max(1, frames);
  const fluxStd = Math.sqrt(flux.reduce((a, b) => a + (b - fluxMean) ** 2, 0) / Math.max(1, frames));
  let onsets = 0;
  for (let i = 1; i < frames - 1; i++) {
    if (flux[i] > fluxMean + fluxStd * 0.8 && flux[i] >= flux[i - 1] && flux[i] > flux[i + 1]) onsets++;
  }
  const onsetRate = onsets / Math.max(1, span);
  const spikiness = fluxMean > 0 ? fluxStd / fluxMean : 0;
  const loudness = clamp((meanDb + 36) / 28);
  const brightness = clamp((meanCentroid - 300) / 1500);
  const percussiveness = clamp((spikiness - 0.35) / 0.9);
  const tempoDrive = clamp((bpm - 60) / 100);
  const energy = clamp(0.3 * loudness + 0.3 * tempoDrive + 0.2 * clamp(onsetRate / 6) + 0.2 * brightness);

  const { key, mode, modeConfidence } = estimateKey(chroma);

  const envelope: number[] = [];
  const bins = 64;
  for (let b = 0; b < bins; b++) {
    const s = Math.floor((b * frames) / bins);
    const e = Math.max(s + 1, Math.floor(((b + 1) * frames) / bins));
    let m = 0;
    for (let i = s; i < e && i < frames; i++) m += rms[i];
    envelope.push(m / (e - s));
  }
  const peak = Math.max(...envelope, 1e-6);

  return {
    duration: round(duration, 1),
    bpm: Math.round(bpm),
    bpmConfidence: round(confidence),
    energy: round(energy),
    dynamics: round(clamp(stdDb / 12)),
    brightness: round(brightness),
    percussiveness: round(percussiveness),
    key,
    mode,
    modeConfidence: round(modeConfidence),
    envelope: envelope.map((v) => round(v / peak, 2)),
  };
}

function estimateTempo(flux: Float64Array, frameRate: number): { bpm: number; confidence: number } {
  const n = flux.length;
  if (n < frameRate * 4) return { bpm: 100, confidence: 0 };
  const win = Math.round(frameRate * 0.5);
  const onset = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += flux[i];
    if (i >= win) acc -= flux[i - win];
    onset[i] = Math.max(0, flux[i] - acc / Math.min(i + 1, win));
  }
  const minLag = Math.floor((60 * frameRate) / 200);
  const maxLag = Math.ceil((60 * frameRate) / 55);
  const ac = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
    ac[lag] = s / (n - lag);
  }
  let zero = 0;
  for (let i = 0; i < n; i++) zero += onset[i] * onset[i];
  zero /= n;

  let bestLag = minLag, bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * frameRate) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2);
    const harmonic = lag * 2 <= maxLag + 1 ? ac[lag * 2] * 0.5 : 0;
    const score = (ac[lag] + harmonic) * prior;
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  const a = ac[bestLag - 1] ?? ac[bestLag], b = ac[bestLag], c = ac[bestLag + 1] ?? ac[bestLag];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
  let bpm = (60 * frameRate) / (bestLag + shift);
  if (bpm > 120 && bestLag * 2 <= maxLag) {
    let strong = 0, weak = 0;
    for (let phase = 0; phase < bestLag * 2; phase++) {
      let even = 0, odd = 0;
      for (let i = phase; i + bestLag < n; i += bestLag * 2) {
        even += onset[i];
        odd += onset[i + bestLag];
      }
      if (even > strong) { strong = even; weak = odd; }
    }
    if (weak < strong * 0.55) bpm /= 2;
  }
  while (bpm < 62) bpm *= 2;
  while (bpm > 185) bpm /= 2;
  return { bpm, confidence: clamp(zero > 0 ? (ac[bestLag] / zero) * 2.2 : 0) };
}

function estimateKey(chroma: Float64Array): { key: string; mode: "major" | "minor"; modeConfidence: number } {
  const best = { major: { r: -2, k: 0 }, minor: { r: -2, k: 0 } };
  for (let k = 0; k < 12; k++) {
    const rotated = Array.from({ length: 12 }, (_, i) => chroma[(i + k) % 12]);
    const rMaj = pearson(rotated, MAJOR);
    const rMin = pearson(rotated, MINOR);
    if (rMaj > best.major.r) best.major = { r: rMaj, k };
    if (rMin > best.minor.r) best.minor = { r: rMin, k };
  }
  const mode = best.major.r >= best.minor.r ? "major" : "minor";
  const chosen = best[mode];
  return {
    key: `${NOTES[chosen.k]} ${mode}`,
    mode,
    modeConfidence: clamp(Math.abs(best.major.r - best.minor.r) * 4),
  };
}

function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi;
        re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

export function parseWav(buf: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 12, channels = 1, sampleRate = 44100, bits = 16;
  while (p + 8 <= buf.length) {
    const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
    const size = view.getUint32(p + 4, true);
    if (id === "fmt ") {
      channels = view.getUint16(p + 10, true);
      sampleRate = view.getUint32(p + 12, true);
      bits = view.getUint16(p + 22, true);
    } else if (id === "data") {
      if (bits !== 16) throw new Error("Only 16-bit PCM WAV is supported");
      const frames = Math.floor(size / (2 * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let s = 0;
        for (let c = 0; c < channels; c++) s += view.getInt16(p + 8 + (i * channels + c) * 2, true);
        samples[i] = s / channels / 32768;
      }
      return { samples, sampleRate };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error("No audio data found in WAV");
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
