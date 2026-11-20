"use client";

import { upload } from "@vercel/blob/client";
import type { AudioAnalysis, ImageAnalysis, MediaRef } from "../types";
import { analyzePixels } from "../analysis/image";
import { analyzeSamples } from "../analysis/audio";

export interface AppConfig {
  storage: "blob" | "local";
  database: "postgres" | "file";
  persistent: boolean;
}

export interface PreparedPhoto {
  id: string;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
  analysis: ImageAnalysis;
}

const MAX_SIDE = 1800;
const DIRECT_LIMIT = 4 * 1024 * 1024;

async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeImage(file);
  } catch {
    throw new Error(`“${file.name}” could not be opened. Use JPEG, PNG or WebP.`);
  }
  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", 0.86));

  const small = document.createElement("canvas");
  const s = Math.min(1, 128 / Math.max(width, height));
  small.width = Math.max(1, Math.round(width * s));
  small.height = Math.max(1, Math.round(height * s));
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  const data = sctx.getImageData(0, 0, small.width, small.height).data;
  if ("close" in source) source.close();

  return {
    id: crypto.randomUUID(),
    blob,
    preview: URL.createObjectURL(blob),
    width,
    height,
    analysis: analyzePixels(data, small.width, small.height, { width, height }),
  };
}

export async function analyzeAudioFile(file: File): Promise<AudioAnalysis> {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const ch = buffer.getChannelData(c);
      for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buffer.numberOfChannels;
    }
    await new Promise((r) => setTimeout(r, 30));
    return analyzeSamples(mono, buffer.sampleRate);
  } catch {
    throw new Error("This audio file could not be decoded by your browser. Try MP3, WAV, M4A or OGG.");
  } finally {
    void ctx.close();
  }
}

let ownerKey: Promise<string> | null = null;
const getOwnerKey = () =>
  (ownerKey ??= fetch("/api/diary-key").then(async (r) => {
    if (!r.ok) throw new Error("Your diary key is missing — reload the page.");
    return ((await r.json()) as { key: string }).key;
  }));

const EXT: Record<string, string> = { "image/jpeg": "jpg", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac" };

export async function uploadMedia(blob: Blob, kind: "image" | "audio" | "narration", config: AppConfig, onProgress?: (p: number) => void): Promise<MediaRef> {
  const type = (blob.type || "application/octet-stream").split(";")[0];
  if (config.storage === "blob" && blob.size > DIRECT_LIMIT) {
    const owner = await getOwnerKey();
    const key = `u/${owner}/${kind}/${crypto.randomUUID()}.${EXT[type] ?? "bin"}`;
    await upload(key, blob, {
      access: "private",
      handleUploadUrl: "/api/upload/token",
      contentType: type,
      multipart: blob.size > 8 * 1024 * 1024,
      onUploadProgress: (e) => onProgress?.(e.percentage / 100),
    });
    return { key, url: `/api/media/${key}`, contentType: type, size: blob.size };
  }
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", blob, `upload.${EXT[type] ?? "bin"}`);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Upload failed");
  onProgress?.(1);
  return json as MediaRef;
}
