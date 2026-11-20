import type { Metadata } from "next";
import { Archive, DiaryKey } from "@/components/Archive";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { ensureDemos } from "@/lib/server/seed";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const owner = await currentOwnerOrNull();
  await ensureDemos();
  const entries = owner ? await repo.list(owner, {}) : [];
  const mine = entries.filter((e) => !e.demo).length;
  return (
    <main className="wrap" style={{ paddingTop: "var(--s-7)", paddingBottom: "var(--s-9)" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "end", gap: 24, marginBottom: "var(--s-7)" }}>
        <div>
          <h1 className="display" style={{ fontSize: "var(--t-1)" }}>
            Days, <em>developed.</em>
          </h1>
        </div>
        <p className="meta">{mine} of your own · {entries.length - mine} demonstration{entries.length - mine === 1 ? "" : "s"}</p>
      </header>
      <Archive initial={entries.map(({ keywords: _k, ...e }) => e)} />
      <DiaryKey />
    </main>
  );
}
