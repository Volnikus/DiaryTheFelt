import { aiChat, ChatIn } from "@/lib/server/ai";
import { handle, json } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    return json(await aiChat(ChatIn.parse(await request.json())));
  } catch (err) {
    return handle(err);
  }
}
