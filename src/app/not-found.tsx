import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "grid", alignContent: "center", gap: 24 }}>
      <h1 className="display" style={{ fontSize: "var(--t-1)" }}>This day isn’t in your archive.</h1>
      <p className="muted">It may have been deleted, or it belongs to a different diary key.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/archive" className="btn">Open the archive</Link>
        <Link href="/new" className="btn btn-primary">Write a new day</Link>
      </div>
    </main>
  );
}
