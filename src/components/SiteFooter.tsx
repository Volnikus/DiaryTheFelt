import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          <strong style={{ color: "var(--paper)", fontWeight: 650 }}>Felt</strong>, a diary for how the day felt.
        </p>
        <p>Example entries are fictional, with CC0 photos and original music. Mood readings only shape the design and are not a health assessment.</p>
        <nav style={{ display: "flex", gap: 20 }} className="meta">
          <Link href="/new">New day</Link>
          <Link href="/archive">Archive</Link>
          <Link href="/year">Year in review</Link>
        </nav>
      </div>
    </footer>
  );
}
