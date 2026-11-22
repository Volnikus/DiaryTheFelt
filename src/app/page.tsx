import Link from "next/link";
import { HomeWriter } from "@/components/HomeWriter";
import { InView } from "@/components/InView";
import { PeekingMote } from "@/components/PeekingMote";
import { MemoryCard } from "@/components/MemoryCard";
import { Arrow, Underline } from "@/components/Sketch";
import { StoryScroll } from "@/components/StoryScroll";
import { TossIn } from "@/components/TossIn";
import { Transform } from "@/components/Transform";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { getDemoEntries } from "@/lib/server/seed";
import s from "./page.module.css";

const STYLES: [string, string, string][] = [
  ["Film", "Faded prints, grain and a date stamp in the corner", "Days that already feel like the past"],
  ["Editorial", "One strong photo and a quiet column of words", "Calm, clear days"],
  ["Collage", "Taped prints, loud type, cuts on the beat", "Busy days with people"],
  ["Minimal", "One small picture and a lot of white paper", "Quiet days alone"],
  ["Abstract", "Black-and-white frames, a grid and hard cuts", "Pressure and late nights"],
];

const EXTRAS = [
  ["/recap", "Weekly and monthly recaps", "every week and month as one card for Instagram: the mood, the words, the photos and the song"],
  ["/year", "Year in review", "a short story of your year: moods, the colour of each month, the songs that kept coming back"],
  ["/archive", "Mood calendar", "every day you wrote, coloured by how it felt"],
  ["/archive", "Postcards and stories", "save any day as a postcard or a 9:16 picture"],
  ["/new", "Voice typing", "speak instead of typing, in English, Russian or Kazakh"],
  ["/new", "Nimbus", "a small cloud that can name your day, find a song or just listen"],
  ["/archive", "No account", "your diary lives behind a private key in your browser"],
];

export default async function Home() {
  const owner = await currentOwnerOrNull();
  const demos = await getDemoEntries();
  const all = owner ? await repo.list(owner, {}) : [];
  const recent = all.filter((e) => !e.demo).slice(0, 3);
  const examples = all.filter((e) => e.demo);
  const preview = recent.length ? recent : examples.slice(0, 3);
  const sample = demos.find((d) => d.id.startsWith("demo-autumn")) ?? demos[0];
  const heroCard = examples.find((e) => e.id === sample?.id) ?? examples[0];
  const lines = sample ? wrapLines(sample.text, 44, 4) : [];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className={s.home}>
      {/* ---------- the open notebook ---------- */}
      <section className={`wrap ${s.spread}`}>
        <div className={s.left}>
          <p className={`hand ${s.date} ${s.rise}`}>{today.toLowerCase()}</p>
          <h1 className={`display ${s.title}`}>
            {"Write down how today".split(" ").map((w, i) => (
              <span key={w} className={s.word} style={{ ["--i" as string]: i + 1 }}>{w} </span>
            ))}
            <span className={s.word} style={{ ["--i" as string]: 5 }}><Underline delay={1000}>felt</Underline></span>
          </h1>
          <p className={`${s.lede} ${s.rise}`} style={{ ["--i" as string]: 6 }}>
            Add your photos and the song you had on. Felt reads the mood of your words and turns the page into a short animated memory, kept private in your browser.
          </p>
          <div className={s.rise} style={{ ["--i" as string]: 7 }}>
            <HomeWriter />
          </div>
        </div>

        {heroCard && (
          <figure className={s.right}>
            <div className={`${s.polaroid} ${s.land}`}>
              <span className={`tape ${s.tapeTop}`} aria-hidden />
              <MemoryCard entry={heroCard} priority />
            </div>
            {sample && (
              <figcaption className={`hand ${s.caption} ${s.late}`}>
                <Arrow direction="left" className={s.captionArrow} />
                made from {sample.photos.length} photos, {sample.text.split(/\s+/).length} words
                <br />and a {sample.musicProfile.bpm} bpm song
              </figcaption>
            )}
            {sample && <Link href={`/m/${sample.id}`} className={`${s.peek} ${s.late}`}>Open this memory</Link>}
          </figure>
        )}
      </section>

      {/* ---------- how it works: the page fills itself in as you scroll ---------- */}
      {sample && heroCard ? (
        <StoryScroll
          lines={lines}
          photos={sample.photos.map((p) => p.media.url)}
          envelope={sample.musicProfile.envelope}
          bpm={sample.musicProfile.bpm}
          keyLabel={sample.musicProfile.key ?? sample.musicProfile.mode}
          memory={heroCard}
        />
      ) : null}

      {/* ---------- a finished memory ---------- */}
      <section className={`wrap cv ${s.section}`}>
        <p className="section-label">And then</p>
        <h2 className={`display ${s.h2}`}>The page turns into a memory</h2>
        <p className={s.sub}>The same three inputs, read together. Switch between the example days to compare.</p>
        <Transform entries={demos.map((e) => ({ ...e, owner: "" }))} />
      </section>

      {/* ---------- five styles ---------- */}
      <section className={`wrap cv ${s.section} ${s.split}`}>
        <div>
          <p className="section-label">No templates</p>
          <h2 className={`display ${s.h2}`}>Five ways a day can look</h2>
          <p className={s.sub}>Felt scores every entry against five styles, then tunes colour, type, texture and motion to that one day.</p>
        </div>
        <InView as="ul" className={s.styles}>
          {STYLES.map(([name, text, when], i) => (
            <li key={name} style={{ ["--i" as string]: i }}>
              <div>
                <h3>{name}</h3>
                <p>{text}</p>
              </div>
              <span className={s.when}>{when}</span>
            </li>
          ))}
        </InView>
      </section>

      {/* ---------- the back of the notebook ---------- */}
      <section className={`wrap cv ${s.section}`}>
        <p className="section-label">In the back of the notebook</p>
        <InView as="ul" className={s.extras}>
          {EXTRAS.map(([href, title, text], i) => (
            <li key={title} style={{ ["--i" as string]: i }}>
              <Link href={href}>
                <svg viewBox="0 0 24 24" className={s.tick} aria-hidden><path d="M3 13 C 6 15, 8 18, 9 20 C 12 13, 16 8, 22 3" /></svg>
                <span><b>{title}</b> — {text}</span>
              </Link>
            </li>
          ))}
        </InView>
      </section>

      {preview.length > 0 && (
        <section className={`wrap cv ${s.section}`}>
          <div className={s.rowHead}>
            <div>
              <p className="section-label">{recent.length ? "Your last pages" : "Examples"}</p>
              <h2 className={`display ${s.h2}`}>{recent.length ? "Recently kept" : "Pages from other days"}</h2>
            </div>
            <Link href="/archive" className="btn btn-small">Open the archive</Link>
          </div>
          <div className={s.cards}>
            {preview.map((e, i) => (
              <TossIn key={e.id} className={s.pinned} tilt={[-1.6, 1.1, -0.6][i % 3]} index={i}>
                <span className={`tape ${s.tapeCorner}`} aria-hidden />
                <MemoryCard entry={e} />
              </TossIn>
            ))}
          </div>
        </section>
      )}

      <section className={`wrap ${s.section}`}>
        <InView className={s.final} amount={0.6}>
          <PeekingMote />
          <div>
            <h2 className={`display ${s.h2}`}>Start with today</h2>
            <p>It takes about two minutes. You can edit or delete any page later.</p>
          </div>
          <Link href="/new" className="btn btn-primary">Open a new page</Link>
        </InView>
      </section>
    </main>
  );
}

/** Break the sample day into a few short lines, as if written on the page by hand. */
function wrapLines(text: string, width: number, max: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if ((line + " " + w).trim().length > width) { out.push(line.trim()); line = w; if (out.length === max) break; }
    else line = `${line} ${w}`;
  }
  if (out.length < max && line.trim()) out.push(line.trim());
  return out.slice(0, max);
}
