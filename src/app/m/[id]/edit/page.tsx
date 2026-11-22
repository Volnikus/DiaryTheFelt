import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Composer } from "@/components/Composer";
import { appConfig } from "@/lib/server/config";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";

export const metadata: Metadata = { title: "Edit memory" };

export default async function EditPage(props: PageProps<"/m/[id]/edit">) {
  const { id } = await props.params;
  const owner = await currentOwnerOrNull();
  const entry = owner ? await repo.get(owner, id) : null;
  if (!entry || entry.owner !== owner) notFound();
  return (
    <main className="wrap" style={{ paddingTop: "var(--s-7)", paddingBottom: "var(--s-10)" }}>
      <header style={{ marginBottom: "var(--s-8)", maxWidth: 900 }}>
        <Link href={`/m/${entry.id}`} className="meta">← Back to the memory</Link>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 3.6vw, 2.8rem)", marginTop: "var(--s-4)" }}>
          Edit “{entry.title}”
        </h1>
        <p className="lede" style={{ marginTop: "var(--s-3)", fontSize: "1.05rem" }}>Change anything you like. The memory is rebuilt from what you keep.</p>
      </header>
      <Composer config={appConfig()} initial={{ ...entry, owner: "" }} />
    </main>
  );
}
