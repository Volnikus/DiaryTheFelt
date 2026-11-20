import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";
import { InputError } from "./develop";
import { UnauthorizedError } from "./owner";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "cache-control": "no-store", ...init?.headers } });
}

export function fail(status: number, message: string) {
  return json({ error: message }, { status });
}

export function handle(err: unknown) {
  if (err instanceof ZodError) return fail(400, err.issues[0]?.message ?? "Invalid input");
  if (err instanceof InputError) return fail(400, err.message);
  if (err instanceof UnauthorizedError) return fail(401, "Your diary key is missing — reload the page.");
  console.error(err);
  return fail(500, "Something went wrong while developing this memory. Please try again.");
}
