import { z } from "zod/v4";
import { fail, handle, json } from "@/lib/server/http";
import { rateLimited } from "@/lib/server/ratelimit";
import { searchTracks } from "@/lib/server/spotify";

const In = z.object({
  q: z.string().trim().min(1, "Type a song or artist").max(200),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  clean: z.enum(["0", "1"]).default("1"),
});

export async function GET(request: Request) {
  if (rateLimited(request, "spotify", 60, 5 * 60 * 1000)) return fail(429, "Too many searches — try again in a minute.");
  try {
    const p = new URL(request.url).searchParams;
    const { q, limit, clean } = In.parse({ q: p.get("q") ?? "", limit: p.get("limit") ?? undefined, clean: p.get("clean") ?? undefined });
    const out = await searchTracks(q, clean === "1" ? Math.min(20, limit * 2) : limit);
    const tracks = (clean === "1" ? out.tracks.filter((t) => !t.explicit) : out.tracks).slice(0, limit);
    // Not personal data: let the CDN and the browser reuse identical searches.
    return json({ provider: out.provider, tracks }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (err) {
    return handle(err);
  }
}
