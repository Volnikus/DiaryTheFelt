import { currentOwner } from "@/lib/server/owner";
import { fail, handle, json } from "@/lib/server/http";
import { ALLOWED_TYPES, LIMITS, mediaUrl, newKey, saveMedia, type MediaKind } from "@/lib/server/storage";

export async function POST(request: Request) {
  try {
    const owner = await currentOwner();
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind")) as MediaKind;
    if (!(file instanceof Blob) || !(kind in LIMITS)) return fail(400, "No file received");
    const type = file.type.split(";")[0];
    if (!ALLOWED_TYPES[kind].includes(type)) return fail(415, `This ${kind === "image" ? "image" : "audio"} format is not supported`);
    if (file.size > LIMITS[kind]) return fail(413, `File is larger than ${Math.round(LIMITS[kind] / 1024 / 1024)} MB`);
    const key = newKey(owner, kind, type);
    await saveMedia(key, file, type);
    return json({ key, url: mediaUrl(key), contentType: type, size: file.size });
  } catch (err) {
    return handle(err);
  }
}
