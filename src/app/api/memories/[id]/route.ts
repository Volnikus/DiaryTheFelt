import { z } from "zod/v4";
import { repo } from "@/lib/server/db";
import { developEntry, EntryInput, mediaKeys } from "@/lib/server/develop";
import { fail, handle, json } from "@/lib/server/http";
import { currentOwner } from "@/lib/server/owner";
import { deleteMedia } from "@/lib/server/storage";

export const maxDuration = 60;

export async function GET(_: Request, ctx: RouteContext<"/api/memories/[id]">) {
  try {
    const owner = await currentOwner();
    const entry = await repo.get(owner, (await ctx.params).id);
    return entry ? json(entry) : fail(404, "Memory not found");
  } catch (err) {
    return handle(err);
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  try {
    const owner = await currentOwner();
    const previous = await repo.get(owner, (await ctx.params).id);
    if (!previous) return fail(404, "Memory not found");
    if (previous.owner !== owner) return fail(403, "Demonstration days cannot be edited");
    const input = EntryInput.parse(await request.json());
    const entry = await developEntry(input, { id: previous.id, owner, previous });
    await repo.save(entry);
    const kept = new Set(mediaKeys(entry));
    await deleteMedia(mediaKeys(previous).filter((k) => !kept.has(k)));
    return json({ id: entry.id, title: entry.title });
  } catch (err) {
    return handle(err);
  }
}

const Rename = z.object({ title: z.string().trim().min(1).max(80) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  try {
    const owner = await currentOwner();
    const entry = await repo.get(owner, (await ctx.params).id);
    if (!entry) return fail(404, "Memory not found");
    if (entry.owner !== owner) return fail(403, "Demonstration days cannot be renamed");
    const { title } = Rename.parse(await request.json());
    await repo.save({ ...entry, title, titleLocked: true, updatedAt: new Date().toISOString() });
    return json({ title });
  } catch (err) {
    return handle(err);
  }
}

export async function DELETE(_: Request, ctx: RouteContext<"/api/memories/[id]">) {
  try {
    const owner = await currentOwner();
    const entry = await repo.get(owner, (await ctx.params).id);
    if (!entry) return fail(404, "Memory not found");
    if (entry.owner !== owner) return fail(403, "Demonstration days cannot be deleted");
    await repo.remove(owner, entry.id);
    await deleteMedia(mediaKeys(entry));
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
