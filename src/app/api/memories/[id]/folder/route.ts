import { promises as fs } from "node:fs";
import path from "node:path";
import { repo } from "@/lib/server/db";
import { fail, handle } from "@/lib/server/http";
import { currentOwner } from "@/lib/server/owner";
import { posterSvg } from "@/lib/server/poster";
import { readMediaBuffer } from "@/lib/server/storage";
import { buildZip } from "@/lib/server/zip";
import type { MediaRef } from "@/lib/types";

export const maxDuration = 60;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/wav": "wav", "audio/mpeg": "mp3", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

async function load(ref: MediaRef): Promise<Uint8Array | null> {
  if (ref.key.startsWith("demo/")) return fs.readFile(path.join(process.cwd(), "public", ref.url)).catch(() => null);
  const m = await readMediaBuffer(ref.key);
  return m ? new Uint8Array(m.data) : null;
}

export async function GET(_: Request, ctx: RouteContext<"/api/memories/[id]/folder">) {
  try {
    const owner = await currentOwner();
    const e = await repo.get(owner, (await ctx.params).id);
    if (!e) return fail(404, "Memory not found");
    const enc = new TextEncoder();
    const folder = `${e.day} ${e.title}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
    const files: { name: string; data: Uint8Array }[] = [
      { name: `${folder}/entry.txt`, data: enc.encode(`${e.title}\n${e.day}\n\n${e.text}\n`) },
      { name: `${folder}/memory.svg`, data: enc.encode(posterSvg(e)) },
      {
        name: `${folder}/memory.json`,
        data: enc.encode(JSON.stringify({ title: e.title, day: e.day, demo: e.demo, interpretation: e.analysis, music: e.musicProfile, design: e.design, generation: e.generation }, null, 2)),
      },
    ];
    for (const [i, p] of e.photos.entries()) {
      const data = await load(p.media);
      if (data) files.push({ name: `${folder}/photos/${String(i + 1).padStart(2, "0")}.${EXT[p.media.contentType] ?? "jpg"}`, data });
    }
    if (e.music.kind === "file") {
      const data = await load(e.music.media);
      if (data) files.push({ name: `${folder}/music/${e.music.name.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "track"}.${EXT[e.music.media.contentType] ?? "audio"}`, data });
    } else {
      files.push({ name: `${folder}/music/link.txt`, data: enc.encode(`${[e.music.title, e.music.artist].filter(Boolean).join(" — ")}\n${e.music.url}\n`) });
    }
    if (e.narration) {
      const data = await load(e.narration);
      if (data) files.push({ name: `${folder}/narration.${EXT[e.narration.contentType.split(";")[0]] ?? "webm"}`, data });
    }
    const zip = buildZip(files);
    return new Response(zip.buffer as ArrayBuffer, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(folder)}.zip`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return handle(err);
  }
}
