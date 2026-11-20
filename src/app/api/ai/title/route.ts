import { z } from "zod/v4";
import { aiTitle } from "@/lib/server/ai";
import { rateLimited } from "@/lib/server/guard";
import { fail, handle, json } from "@/lib/server/http";

const In = z.object({ text: z.string().trim().min(12, "Write a little more first").max(8000) });

export async function POST(request: Request) {
  if (rateLimited(request, "title", 15, 10 * 60 * 1000)) return fail(429, "nimbus needs a little rest — try again in a few minutes.");
  try {
    return json(await aiTitle(In.parse(await request.json()).text));
  } catch (err) {
    return handle(err);
  }
}
