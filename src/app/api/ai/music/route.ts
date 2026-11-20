import { z } from "zod/v4";
import { aiMusic } from "@/lib/server/ai";
import { rateLimited } from "@/lib/server/guard";
import { fail, handle, json } from "@/lib/server/http";

const In = z.object({ text: z.string().trim().min(12, "Write a little about the day first").max(8000), wish: z.string().max(300).optional() });

export async function POST(request: Request) {
  if (rateLimited(request, "music", 15, 10 * 60 * 1000)) return fail(429, "nimbus needs a little rest — try again in a few minutes.");
  try {
    const { text, wish } = In.parse(await request.json());
    return json(await aiMusic(text, wish));
  } catch (err) {
    return handle(err);
  }
}
