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
      <header style={{ marginBottom: "var(--s-6)", maxWidth: 760 }}>
        <p className="section-label">a new page</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", marginTop: 6 }}>
          How did <em>today</em> feel?
        </h1>
        <p className="lede" style={{ marginTop: "var(--s-3)", maxWidth: "60ch" }}>
          Write it down, tape in the photographs you took and add the song that stayed with you. Mote reads the mood as you write; Nimbus, the little cloud in the corner, can help if you want.
        </p>
      </header>
      <Composer config={appConfig()} draft={draft} />
    </main>
  );
}
