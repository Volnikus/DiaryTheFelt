import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, isValidOwner } from "@/lib/server/owner-token";

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(OWNER_COOKIE)?.value;
  if (existing && isValidOwner(existing)) return NextResponse.next();

  const owner = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  request.cookies.set(OWNER_COOKIE, owner);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(OWNER_COOKIE, owner, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|demo/|favicon|icon).*)"],
};
