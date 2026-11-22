import type { Metadata } from "next";
import { Composer } from "@/components/Composer";
import { appConfig } from "@/lib/server/config";

export const metadata: Metadata = { title: "A new day" };
export const dynamic = "force-dynamic";

export default async function NewPage({ searchParams }: { searchParams: Promise<{ text?: string | string[] }> }) {
  const { text } = await searchParams;
  const draft = typeof text === "string" ? text.slice(0, 2000) : undefined;
  return (
    <main className="wrap" style={{ paddingTop: "var(--s-7)", paddingBottom: "var(--s-10)" }}>
      <header style={{ marginBottom: "var(--s-6)", maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 3.6vw, 2.8rem)" }}>
          How did today feel?
        </h1>
        <p className="lede" style={{ marginTop: "var(--s-3)", fontSize: "1.05rem", maxWidth: "60ch" }}>
          Write it down, add the photographs you took and the song that stayed with you. Felt reads the mood as you type. If you want help finding words, the optional AI helper is in the corner.
        </p>
      </header>
      <Composer config={appConfig()} draft={draft} />
    </main>
  );
}
