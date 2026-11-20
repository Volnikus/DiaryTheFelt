import { resolveLink } from "@/lib/server/develop";
import { fail, handle, json } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) return fail(400, "Missing link");
    return json(await resolveLink(url));
  } catch (err) {
    return handle(err);
  }
}
