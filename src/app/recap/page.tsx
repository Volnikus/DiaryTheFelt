import type { Metadata } from "next";
import { RecapStudio } from "@/components/RecapStudio";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { ensureDemos } from "@/lib/server/seed";
import { recapsFrom } from "@/lib/recap";

export const metadata: Metadata = { title: "Weekly and monthly recaps" };

export default async function RecapPage() {
  const owner = await currentOwnerOrNull();
  await ensureDemos();
  const entries = owner ? await repo.list(owner, {}) : [];
  const { weeks, months, demo } = recapsFrom(entries);

  return (
    <main className="wrap" style={{ paddingTop: "var(--s-7)", paddingBottom: "var(--s-9)" }}>
      <header style={{ marginBottom: "var(--s-6)", maxWidth: "40rem" }}>
        <p className="section-label">Recaps</p>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 3.6vw, 2.8rem)", margin: "8px 0 12px" }}>Your week and month, on one page</h1>
        <p style={{ margin: 0, color: "var(--paper-2)", lineHeight: 1.6 }}>
          Felt gathers the pages of a week or a month into one card — the mood it mostly had, the words that kept coming back, the photos and the song — ready to post.
        </p>
      </header>
      <RecapStudio weeks={weeks} months={months} demo={demo} />
    </main>
  );
}
