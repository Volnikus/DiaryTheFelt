import { cookies } from "next/headers";
import { z } from "zod/v4";
import { fail, handle, json } from "@/lib/server/http";
import { currentOwner } from "@/lib/server/owner";
import { OWNER_COOKIE, isValidOwner } from "@/lib/server/owner-token";

export async function GET() {
  try {
    return json({ key: await currentOwner() });
  } catch (err) {
    return handle(err);
  }
}

export async function POST(request: Request) {
  try {
    const { key } = z.object({ key: z.string().trim() }).parse(await request.json());
    if (!isValidOwner(key)) return fail(400, "That is not a valid diary key");
    (await cookies()).set(OWNER_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
