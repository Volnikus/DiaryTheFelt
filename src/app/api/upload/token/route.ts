import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentOwner } from "@/lib/server/owner";
import { fail, handle, json } from "@/lib/server/http";
import { ALLOWED_TYPES, LIMITS, STORAGE_DRIVER, type MediaKind } from "@/lib/server/storage";

export async function POST(request: Request) {
  if (STORAGE_DRIVER !== "blob") return fail(404, "Direct uploads are not configured");
  try {
    const owner = await currentOwner();
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const kind = pathname.split("/")[2] as MediaKind;
        if (!pathname.startsWith(`u/${owner}/`) || !(kind in LIMITS) || pathname.includes("..")) {
          throw new Error("Invalid upload path");
        }
        return { allowedContentTypes: ALLOWED_TYPES[kind], maximumSizeInBytes: LIMITS[kind], addRandomSuffix: false };
      },
    });
    return json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid upload path") return fail(403, err.message);
    return handle(err);
  }
}
