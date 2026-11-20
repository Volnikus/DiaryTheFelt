import "server-only";
import { cookies } from "next/headers";
import { OWNER_COOKIE, isValidOwner } from "./owner-token";

export class UnauthorizedError extends Error {}

export async function currentOwner(): Promise<string> {
  const value = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!value || !isValidOwner(value)) throw new UnauthorizedError("Missing diary key");
  return value;
}

export async function currentOwnerOrNull(): Promise<string | null> {
  const value = (await cookies()).get(OWNER_COOKIE)?.value;
  return value && isValidOwner(value) ? value : null;
}
