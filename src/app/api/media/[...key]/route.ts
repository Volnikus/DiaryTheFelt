import { currentOwnerOrNull } from "@/lib/server/owner";
import { ownsKey, readMedia } from "@/lib/server/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.map(decodeURIComponent).join("/");
  const owner = await currentOwnerOrNull();
  if (!owner || !ownsKey(owner, key)) return new Response("Not found", { status: 404 });
  const media = await readMedia(key, request.headers.get("range"));
  if (!media) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "content-type": media.contentType,
    "content-length": String(media.length),
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=31536000, immutable",
  };
  if (media.contentRange) headers["content-range"] = media.contentRange;
  return new Response(media.stream, { status: media.contentRange ? 206 : 200, headers });
}
