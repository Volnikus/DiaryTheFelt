import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemoryView } from "@/components/MemoryView";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { ensureDemos } from "@/lib/server/seed";

async function load(id: string) {
  const owner = await currentOwnerOrNull();
  if (!owner) return null;
  await ensureDemos();
  return repo.get(owner, id);
}

export async function generateMetadata(props: PageProps<"/m/[id]">): Promise<Metadata> {
  const entry = await load((await props.params).id);
  return { title: entry?.title ?? "Memory", robots: { index: false } };
}

export default async function MemoryPage(props: PageProps<"/m/[id]">) {
  const { id } = await props.params;
  const { new: fresh } = await props.searchParams;
  const entry = await load(id);
  if (!entry) notFound();
  const { owner: _owner, ...rest } = entry;
  return <MemoryView entry={{ ...rest, owner: "" }} fresh={fresh === "1"} />;
}
