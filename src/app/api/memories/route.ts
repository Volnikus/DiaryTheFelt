import { repo } from "@/lib/server/db";
import { developEntry, EntryInput, newEntryId } from "@/lib/server/develop";
import { handle, json } from "@/lib/server/http";
import { currentOwner } from "@/lib/server/owner";
import { ensureDemos } from "@/lib/server/seed";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const owner = await currentOwner();
    await ensureDemos();
    const p = new URL(request.url).searchParams;
    const scope = p.get("scope");
    const entries = await repo.list(owner, {
      q: p.get("q")?.slice(0, 120) || undefined,
      from: p.get("from") || undefined,
      to: p.get("to") || undefined,
      scope: scope === "mine" || scope === "demo" ? scope : "all",
      mood: p.get("mood") || undefined,
    });
    return json({ entries: entries.map(({ keywords: _k, ...rest }) => rest) });
  } catch (err) {
    return handle(err);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await currentOwner();
    const input = EntryInput.parse(await request.json());
    const entry = await developEntry(input, { id: newEntryId(), owner });
    await repo.save(entry);
    return json({ id: entry.id, title: entry.title }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}
