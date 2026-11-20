import { z } from "zod/v4";
import { aiMusic } from "@/lib/server/ai";
import { handle, json } from "@/lib/server/http";

const In = z.object({ text: z.string().trim().min(12, "Write a little about the day first").max(8000), wish: z.string().max(300).optional() });

export async function POST(request: Request) {
  try {
    const { text, wish } = In.parse(await request.json());
    return json(await aiMusic(text, wish));
  } catch (err) {
    return handle(err);
  }
}
