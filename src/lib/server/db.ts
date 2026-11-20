import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { Entry, EntrySummary } from "../types";
import { DEMO_OWNER } from "./owner-token";

export const DB_DRIVER: "postgres" | "file" = process.env.DATABASE_URL ? "postgres" : "file";
export const DATA_ROOT = process.env.VERCEL ? "/tmp/felt" : path.join(process.cwd(), ".data");

export interface ListQuery {
  q?: string;
  from?: string;
  to?: string;
  scope?: "all" | "mine" | "demo";
}

export function summarize(e: Entry): EntrySummary {
  const song = e.music.kind === "file" ? e.music.name : [e.music.title, e.music.artist].filter(Boolean).join(" — ") || e.music.url;
  return {
    id: e.id,
    demo: e.demo,
    day: e.day,
    title: e.title,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    excerpt: e.text.slice(0, 220),
    atmosphere: e.analysis.atmosphere,
    cover: e.photos[0]?.media.url ?? null,
    palette: e.design.palette,
    treatment: e.design.treatment,
    type: e.design.type,
    envelope: e.musicProfile.envelope,
    bpm: e.musicProfile.bpm,
    song,
    photoCount: e.photos.length,
    keywords: [e.title, e.text, e.analysis.atmosphere, e.analysis.motifs.join(" "), e.analysis.feelings.join(" "), song].join(" ").toLowerCase(),
  };
}

function matches(s: EntrySummary, q: ListQuery) {
  if (q.from && s.day < q.from) return false;
  if (q.to && s.day > q.to) return false;
  if (q.scope === "mine" && s.demo) return false;
  if (q.scope === "demo" && !s.demo) return false;
  if (q.q) {
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((t) => s.keywords.includes(t))) return false;
  }
  return true;
}

const byDay = (a: EntrySummary, b: EntrySummary) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt);

interface Repo {
  list(owner: string, q: ListQuery): Promise<EntrySummary[]>;
  get(owner: string, id: string): Promise<Entry | null>;
  save(entry: Entry): Promise<void>;
  remove(owner: string, id: string): Promise<boolean>;
  hasDemos(ids: string[]): Promise<boolean>;
  removeStaleDemos(keep: string[]): Promise<void>;
}

let sql: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

function pg() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL!, { max: 3, idle_timeout: 20, prepare: false, onnotice: () => {} });
  }
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS felt_entries (
      id text PRIMARY KEY,
      owner text NOT NULL,
      day date NOT NULL,
      demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      summary jsonb NOT NULL,
      data jsonb NOT NULL
    )`.then(() => sql!`CREATE INDEX IF NOT EXISTS felt_entries_owner_day ON felt_entries (owner, day DESC)`).then(() => undefined);
  return { sql, ready };
}

const postgresRepo: Repo = {
  async list(owner, q) {
    const { sql, ready } = pg();
    await ready;
    const rows = await sql<{ summary: EntrySummary }[]>`
      SELECT summary FROM felt_entries WHERE owner = ${owner} OR owner = ${DEMO_OWNER} ORDER BY day DESC, created_at DESC`;
    return rows.map((r) => r.summary).filter((s) => matches(s, q));
  },
  async get(owner, id) {
    const { sql, ready } = pg();
    await ready;
    const rows = await sql<{ data: Entry }[]>`
      SELECT data FROM felt_entries WHERE id = ${id} AND (owner = ${owner} OR owner = ${DEMO_OWNER})`;
    return rows[0]?.data ?? null;
  },
  async save(e) {
    const { sql, ready } = pg();
    await ready;
    const summary = summarize(e);
    await sql`
      INSERT INTO felt_entries (id, owner, day, demo, created_at, updated_at, summary, data)
      VALUES (${e.id}, ${e.owner}, ${e.day}, ${e.demo}, ${e.createdAt}, ${e.updatedAt}, ${sql.json(JSON.parse(JSON.stringify(summary)))}, ${sql.json(JSON.parse(JSON.stringify(e)))})
      ON CONFLICT (id) DO UPDATE SET day = EXCLUDED.day, updated_at = EXCLUDED.updated_at, summary = EXCLUDED.summary, data = EXCLUDED.data
      WHERE felt_entries.owner = EXCLUDED.owner`;
  },
  async remove(owner, id) {
    const { sql, ready } = pg();
    await ready;
    const res = await sql`DELETE FROM felt_entries WHERE id = ${id} AND owner = ${owner}`;
    return res.count > 0;
  },
  async hasDemos(ids) {
    const { sql, ready } = pg();
    await ready;
    const rows = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM felt_entries WHERE id IN ${sql(ids)}`;
    return rows[0].n === ids.length;
  },
  async removeStaleDemos(keep) {
    const { sql, ready } = pg();
    await ready;
    await sql`DELETE FROM felt_entries WHERE owner = ${DEMO_OWNER} AND NOT (id IN ${sql(keep)})`;
  },
};

const FILE = path.join(DATA_ROOT, "entries.json");
let queue: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<Entry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Entry[];
  } catch {
    return [];
  }
}

function writeLocked<T>(fn: (all: Entry[]) => Promise<{ all: Entry[]; result: T }>): Promise<T> {
  const run = queue.then(async () => {
    const { all, result } = await fn(await readAll());
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(all));
    await fs.rename(tmp, FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const fileRepo: Repo = {
  async list(owner, q) {
    await queue;
    return (await readAll())
      .filter((e) => e.owner === owner || e.owner === DEMO_OWNER)
      .map(summarize)
      .filter((s) => matches(s, q))
      .sort(byDay);
  },
  async get(owner, id) {
    await queue;
    return (await readAll()).find((e) => e.id === id && (e.owner === owner || e.owner === DEMO_OWNER)) ?? null;
  },
  save(entry) {
    return writeLocked(async (all) => {
      const i = all.findIndex((e) => e.id === entry.id);
      if (i >= 0 && all[i].owner !== entry.owner) throw new Error("Entry belongs to another diary");
      if (i >= 0) all[i] = entry;
      else all.push(entry);
      return { all, result: undefined };
    });
  },
  remove(owner, id) {
    return writeLocked(async (all) => {
      const next = all.filter((e) => !(e.id === id && e.owner === owner));
      return { all: next, result: next.length !== all.length };
    });
  },
  async hasDemos(ids) {
    await queue;
    const all = await readAll();
    return ids.every((id) => all.some((e) => e.id === id));
  },
  removeStaleDemos(keep) {
    return writeLocked(async (all) => ({ all: all.filter((e) => e.owner !== DEMO_OWNER || keep.includes(e.id)), result: undefined }));
  },
};

export const repo: Repo = DB_DRIVER === "postgres" ? postgresRepo : fileRepo;
