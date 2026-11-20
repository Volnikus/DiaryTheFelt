import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export const STORAGE_DRIVER: "blob" | "local" = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
const LOCAL_ROOT = process.env.VERCEL ? "/tmp/felt/media" : path.join(process.cwd(), ".data", "media");

export const LIMITS = {
  image: 12 * 1024 * 1024,
  audio: 40 * 1024 * 1024,
  narration: 12 * 1024 * 1024,
};
export const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/flac"],
  narration: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"],
};
export type MediaKind = keyof typeof LIMITS;

export function mediaUrl(key: string) {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function newKey(owner: string, kind: MediaKind, contentType: string) {
  const ext = EXT[contentType.split(";")[0]] ?? "bin";
  return `u/${owner}/${kind}/${crypto.randomUUID()}.${ext}`;
}

export function ownsKey(owner: string, key: string) {
  return key.startsWith(`u/${owner}/`) && !key.includes("..");
}

export async function saveMedia(key: string, body: Blob | Buffer, contentType: string) {
  if (STORAGE_DRIVER === "blob") {
    await put(key, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
    return;
  }
  const file = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(await body.arrayBuffer());
  await fs.writeFile(file, buf);
  await fs.writeFile(`${file}.type`, contentType);
}

export interface MediaRead {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  length: number;
  contentRange: string | null;
}

export async function readMedia(key: string, range?: string | null): Promise<MediaRead | null> {
  if (STORAGE_DRIVER === "blob") {
    const res = await get(key, { access: "private", ...(range ? { headers: { range } } : {}) });
    if (!res || res.statusCode !== 200) return null;
    const contentRange = res.headers.get("content-range");
    return {
      stream: res.stream,
      contentType: res.blob.contentType,
      length: Number(res.headers.get("content-length") ?? res.blob.size),
      contentRange,
    };
  }
  const file = path.join(LOCAL_ROOT, key);
  if (!file.startsWith(LOCAL_ROOT)) return null;
  try {
    const [buf, type] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.type`, "utf8").catch(() => "application/octet-stream")]);
    let body = buf;
    let contentRange: string | null = null;
    const m = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (m && (m[1] || m[2])) {
      const size = buf.length;
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
      if (start <= end && start < size) {
        body = buf.subarray(start, end + 1);
        contentRange = `bytes ${start}-${end}/${size}`;
      }
    }
    return {
      stream: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(body)); c.close(); } }),
      contentType: type,
      length: body.length,
      contentRange,
    };
  } catch {
    return null;
  }
}

export async function readMediaBuffer(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const media = await readMedia(key);
  if (!media) return null;
  const data = Buffer.from(await new Response(media.stream).arrayBuffer());
  return { data, contentType: media.contentType };
}

export async function deleteMedia(keys: string[]) {
  if (!keys.length) return;
  if (STORAGE_DRIVER === "blob") {
    await del(keys).catch(() => undefined);
    return;
  }
  await Promise.all(keys.map((k) => Promise.all([fs.rm(path.join(LOCAL_ROOT, k), { force: true }), fs.rm(path.join(LOCAL_ROOT, `${k}.type`), { force: true })])));
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/ogg": "ogg", "audio/webm": "webm", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac",
};
