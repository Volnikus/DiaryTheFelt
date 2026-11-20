import { appConfig } from "@/lib/server/config";
import { json } from "@/lib/server/http";

export function GET() {
  return json(appConfig());
}
