import Link from "next/link";
import { Equalizer, Typewriter } from "@/components/Alive";
import { HomeWriter } from "@/components/HomeWriter";
import { MemoryCard } from "@/components/MemoryCard";
import { Arrow, Circled, Underline } from "@/components/Sketch";
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
  const swatches = demos.flatMap((d) => d.photos.slice(0, 2).flatMap((p) => p.analysis.palette.slice(0, 3).map((c) => c.hex))).slice(0, 12);
  const sample = demos.find((d) => d.id.startsWith("demo-autumn")) ?? demos[0];
  const heroCard = examples.find((e) => e.id === sample?.id) ?? examples[0];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className={s.home}>
      {/* ---------- the open notebook ---------- */}
      <section className={`wrap ${s.spread}`}>
        <div className={s.left}>
          <p className={`hand ${s.date}`}>{today.toLowerCase()}</p>
          <h1 className={`display ${s.title}`}>
            Write down how today <Underline delay={300}>felt</Underline>
          </h1>
          <p className={s.lede}>
            Add your photos and the song you had on. Felt reads the mood of your words and turns the page into a short animated memory, kept private in your browser.
          </p>
          <HomeWriter />
        </div>

        {heroCard && (
          <figure className={s.right}>
            <div className={s.polaroid}>
              <span className={`tape ${s.tapeTop}`} aria-hidden />
              <MemoryCard entry={heroCard} priority />
            </div>
            {sample && (
              <figcaption className={`hand ${s.caption}`}>
                <Arrow direction="left" className={s.captionArrow} />
                made from {sample.photos.length} photos, {sample.text.split(/\s+/).length} words
                <br />and a {sample.musicProfile.bpm} bpm song
              </figcaption>
            )}
            {sample && <Link href={`/m/${sample.id}`} className={s.peek}>Open this memory</Link>}
          </figure>
        )}
      </section>

      {/* ---------- how it works ---------- */}
      <section className={`wrap cv ${s.section}`}>
        <p className="section-label">How it works</p>
        <h2 className={`display ${s.h2}`}>Three things on one page</h2>
        <ol className={s.steps}>
          <li className={s.note}>
            <span className={s.num}><Circled>1</Circled></span>
            <h3>Write the day</h3>
            <p>Where you were, who was there, how heavy it felt. The words set the pace, the light and the handwriting.</p>
            <div className={s.demo}>
              <Typewriter text={sample ? sample.text.split(". ").slice(0, 2).join(". ") + "." : "We walked through the park after lunch."} />
            </div>
          </li>
          <li className={s.note}>
            <span className={s.num}><Circled>2</Circled></span>
            <h3>Tape in your photos</h3>
            <p>Each photo is read for colour, light and focus. Its colours become the paint of the memory.</p>
            <div className={s.demo}>
              <div className={s.swatches}>{swatches.map((c, i) => <i key={i} style={{ background: c, ["--r" as string]: `${(i % 5) * 7 - 14}deg` }} />)}</div>
            </div>
          </li>
          <li className={s.note}>
            <span className={s.num}><Circled>3</Circled></span>
            <h3>Add the song</h3>
            <p>Let Nimbus pick one, search, upload a file or paste a link. Its tempo times every cut.</p>
            <div className={s.demo}>
              <Equalizer bpm={sample?.musicProfile.bpm ?? 96} />
              <span className="meta">{sample ? `${sample.musicProfile.bpm} bpm · ${sample.musicProfile.key ?? sample.musicProfile.mode}` : "tempo · energy · key"}</span>
            </div>
          </li>
        </ol>
      </section>

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
        <ul className={s.styles}>
          {STYLES.map(([name, text, when]) => (
            <li key={name}>
              <div>
                <h3>{name}</h3>
                <p>{text}</p>
              </div>
              <span className={s.when}>{when}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- the back of the notebook ---------- */}
      <section className={`wrap cv ${s.section}`}>
        <p className="section-label">In the back of the notebook</p>
        <ul className={s.extras}>
          {EXTRAS.map(([href, title, text]) => (
            <li key={title}>
              <Link href={href}>
                <svg viewBox="0 0 24 24" className={s.tick} aria-hidden><path d="M3 13 C 6 15, 8 18, 9 20 C 12 13, 16 8, 22 3" /></svg>
                <span><b>{title}</b> — {text}</span>
              </Link>
            </li>
          ))}
        </ul>
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
              <div key={e.id} className={s.pinned} style={{ ["--tilt" as string]: `${[-1.6, 1.1, -0.6][i % 3]}deg` }}>
                <span className={`tape ${s.tapeCorner}`} aria-hidden />
                <MemoryCard entry={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`wrap ${s.section}`}>
        <div className={s.final}>
          <div>
            <h2 className={`display ${s.h2}`}>Start with today</h2>
            <p>It takes about two minutes. You can edit or delete any page later.</p>
          </div>
          <Link href="/new" className="btn btn-primary">Open a new page</Link>
        </div>
      </section>
    </main>
  );
}
