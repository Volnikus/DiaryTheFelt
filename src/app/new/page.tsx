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
      <header style={{ marginBottom: "var(--s-8)", maxWidth: 1000 }}>
        <p className="meta section-label" style={{ marginBottom: "var(--s-4)" }}>a new day</p>
        <h1 className="display" style={{ fontSize: "clamp(3rem, 9vw, 8rem)" }}>
          How did today <em>feel?</em>
        </h1>
        <p className="lede" style={{ marginTop: "var(--s-5)" }}>
          Write it down, add the photographs you took and the song that stayed with you. Mote counts how it felt as you type, the theme blends itself from your words, and Nimbus the cloud is around if you want to talk.
        </p>
      </header>
      <Composer config={appConfig()} draft={draft} />
    </main>
  );
}
