import type { ImageAnalysis } from "../types.ts";
import { hueWarmth, oklabToRgb, rgbToHex, rgbToOklab } from "../color.ts";

type Lab = [number, number, number];

export function analyzePixels(
  data: ArrayLike<number>,
  w: number,
  h: number,
  original: { width: number; height: number } = { width: w, height: h },
): ImageAnalysis {
  const n = w * h;
  const labs: Lab[] = new Array(n);
  const L = new Float32Array(n);
  let sumL = 0, sumC = 0, warmAcc = 0, warmWeight = 0;

  for (let i = 0; i < n; i++) {
    const lab = rgbToOklab([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    labs[i] = lab;
    L[i] = lab[0];
    sumL += lab[0];
    const c = Math.hypot(lab[1], lab[2]);
    sumC += c;
    if (c > 0.02) {
      const hue = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
      warmAcc += hueWarmth((hue + 360) % 360) * c;
      warmWeight += c;
    }
  }

  const meanL = sumL / n;
  let varL = 0;
  for (let i = 0; i < n; i++) varL += (L[i] - meanL) ** 2;
  const stdL = Math.sqrt(varL / n);

  let gradSum = 0, fx = 0, fy = 0, fw = 0, symDiff = 0;
  const meanA = labs.reduce((s, p) => s + p[1], 0) / n;
  const meanB = labs.reduce((s, p) => s + p[2], 0) / n;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = L[i + 1] - L[i - 1];
      const gy = L[i + w] - L[i - w];
      const g = Math.hypot(gx, gy);
      gradSum += g;
      const salience = g * 2 + Math.hypot(labs[i][1] - meanA, labs[i][2] - meanB) + Math.abs(L[i] - meanL) * 0.6;
      const wgt = salience * salience;
      fx += x * wgt;
      fy += y * wgt;
      fw += wgt;
    }
    for (let x = 0; x < w / 2; x++) symDiff += Math.abs(L[y * w + x] - L[y * w + (w - 1 - x)]);
  }
  const inner = Math.max(1, (w - 2) * (h - 2));
  const detail = Math.min(1, (gradSum / inner) / 0.12);
  const symmetry = Math.max(0, 1 - symDiff / (h * (w / 2)) / 0.35);

  const third = Math.floor(h / 3);
  let top = 0, bottom = 0;
  for (let y = 0; y < third; y++) for (let x = 0; x < w; x++) top += L[y * w + x];
  for (let y = h - third; y < h; y++) for (let x = 0; x < w; x++) bottom += L[y * w + x];
  top /= third * w;
  bottom /= third * w;

  const brightness = clamp(meanL);
  const contrast = clamp(stdL / 0.28);
  let lighting: ImageAnalysis["lighting"] = "balanced";
  if (top - bottom > 0.22 && contrast > 0.45) lighting = "backlit";
  else if (brightness < 0.42) lighting = "low-key";
  else if (brightness > 0.74) lighting = "high-key";

  return {
    width: original.width,
    height: original.height,
    palette: kmeansPalette(labs, 6),
    brightness: round(brightness),
    contrast: round(contrast),
    saturation: round(clamp(sumC / n / 0.13)),
    warmth: round(warmWeight > 0 ? warmAcc / warmWeight : 0),
    lighting,
    focusX: round(fw ? fx / fw / (w - 1) : 0.5),
    focusY: round(fw ? fy / fw / (h - 1) : 0.5),
    detail: round(detail),
    symmetry: round(symmetry),
  };
}

function kmeansPalette(points: Lab[], k: number): { hex: string; weight: number }[] {
  const step = Math.max(1, Math.floor(points.length / 2400));
  const sample = points.filter((_, i) => i % step === 0);
  const centers: Lab[] = [sample[Math.floor(sample.length / 2)]];
  while (centers.length < k) {
    let best = sample[0], bestD = -1;
    for (const p of sample) {
      const d = Math.min(...centers.map((c) => dist(p, c)));
      if (d > bestD) { bestD = d; best = p; }
    }
    centers.push(best);
  }
  const counts = new Array(k).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    const acc = centers.map(() => [0, 0, 0]);
    counts.fill(0);
    for (const p of sample) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist(p, centers[c]);
        if (d < bd) { bd = d; bi = c; }
      }
      acc[bi][0] += p[0]; acc[bi][1] += p[1]; acc[bi][2] += p[2];
      counts[bi]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c]) centers[c] = [acc[c][0] / counts[c], acc[c][1] / counts[c], acc[c][2] / counts[c]];
    }
  }
  return centers
    .map((c, i) => ({ hex: rgbToHex(oklabToRgb(c)), weight: round(counts[i] / sample.length) }))
    .filter((p) => p.weight > 0.01)
    .sort((a, b) => b.weight - a.weight);
}

const dist = (a: Lab, b: Lab) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

export function downsample(
  data: ArrayLike<number>,
  w: number,
  h: number,
  max = 128,
): { data: Uint8ClampedArray; w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor((y * h) / th), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / th));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor((x * w) / tw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / tw));
      let r = 0, g = 0, b = 0, c = 0;
      for (let sy = y0; sy < y1; sy += 2) {
        for (let sx = x0; sx < x1; sx += 2) {
          const si = (sy * w + sx) * 4;
          r += data[si]; g += data[si + 1]; b += data[si + 2]; c++;
        }
      }
      const di = (y * tw + x) * 4;
      out[di] = r / c; out[di + 1] = g / c; out[di + 2] = b / c; out[di + 3] = 255;
    }
  }
  return { data: out, w: tw, h: th };
}
