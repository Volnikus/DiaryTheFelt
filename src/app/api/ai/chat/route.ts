import { aiChat, ChatIn } from "@/lib/server/ai";
import { rateLimited } from "@/lib/server/guard";
import { fail, handle, json } from "@/lib/server/http";

export async function POST(request: Request) {
  if (rateLimited(request, "chat", 30, 10 * 60 * 1000)) return fail(429, "nimbus needs a little rest — try again in a few minutes.");
  try {
    return json(await aiChat(ChatIn.parse(await request.json())));
  } catch (err) {
    return handle(err);
  }
}
