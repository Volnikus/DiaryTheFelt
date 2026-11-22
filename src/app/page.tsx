import Link from "next/link";
import { Equalizer, Typewriter } from "@/components/Alive";
import { MemoryCard } from "@/components/MemoryCard";
import { Transform } from "@/components/Transform";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { getDemoEntries } from "@/lib/server/seed";
import s from "./page.module.css";

const STYLES = [
  ["Film", "Faded prints, grain and a date stamp.", "Nostalgic days"],
  ["Editorial", "One strong photo and a quiet column of text.", "Calm, clear days"],
  ["Collage", "Taped prints, bold type, cuts on the beat.", "Busy days with people"],
  ["Minimal", "One small image and a lot of space.", "Quiet days alone"],
  ["Abstract", "Monochrome frames, a grid and hard cuts.", "Pressure and late nights"],
];

const FEATURES = [
  ["/year", "Year in review", "A short story of your year: the moods, the colour of each month, the words and songs that kept coming back."],
  ["/archive", "Mood calendar", "Every entry you wrote, coloured by how the day felt. Click a day to open it."],
  ["/archive", "Postcards and Stories", "Save any day as a postcard, or as a 9:16 image ready for an Instagram Story."],
  ["/new", "Voice typing", "Speak instead of typing, in English, Russian or Kazakh."],
  ["/new", "AI helper", "When AI is switched on, it names your day, describes its atmosphere, suggests songs and answers questions in a chat."],
  ["/archive", "No account needed", "Your diary is tied to a private key stored in your browser. Nothing is public."],
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

  return (
    <main>
      <section className={`wrap ${s.hero}`}>
        <div className={s.heroText}>
          <h1 className={`display ${s.heroTitle}`}>Turn a day into a memory you can replay.</h1>
          <p className={s.lede}>
            Write a few lines, add your photos and the song you had on. Felt reads the mood, the colours and the tempo, and builds a short animated memory that is saved in your private diary.
          </p>
          <div className={s.ctas}>
            <Link href="/new" className="btn btn-primary">Write today’s entry</Link>
            {sample && <Link href={`/m/${sample.id}`} className={s.textLink}>See an example →</Link>}
          </div>
          <p className={s.note}>Free, no account. Entries stay private to your browser.</p>
        </div>
        {heroCard && (
          <figure className={s.heroCard}>
            <MemoryCard entry={heroCard} priority />
            {sample && (
              <figcaption>
                Example entry, generated from {sample.photos.length} photos, {sample.text.split(/\s+/).length} words and a {sample.musicProfile.bpm} bpm song.
              </figcaption>
            )}
          </figure>
        )}
      </section>

      <section className={`wrap ${s.section}`}>
        <h2 className={s.h2}>How it works</h2>
        <ol className={s.steps}>
          <li>
            <span className={s.stepNum}>1</span>
            <h3>Write about the day</h3>
            <p>Where you were, who was there, how it felt. The words set the pace, the light and the type.</p>
            <div className={s.demoBox}>
              <Typewriter text={sample ? sample.text.split(". ").slice(0, 2).join(". ") + "." : "We walked through the park after lunch."} />
            </div>
          </li>
          <li>
            <span className={s.stepNum}>2</span>
            <h3>Add your photos</h3>
            <p>Each photo is read for colour, light and focus. Its colours become the memory’s palette.</p>
            <div className={s.demoBox}>
              <div className={s.swatches}>{swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
            </div>
          </li>
          <li>
            <span className={s.stepNum}>3</span>
            <h3>Pick the song</h3>
            <p>Search for a song, upload a file or let Felt choose. Its measured tempo and key time every cut.</p>
            <div className={s.demoBox}>
              <Equalizer bpm={sample?.musicProfile.bpm ?? 96} />
              <span className="meta">{sample ? `${sample.musicProfile.bpm} bpm · ${sample.musicProfile.key ?? sample.musicProfile.mode}` : "tempo · energy · key"}</span>
            </div>
          </li>
        </ol>
      </section>

      <section className={`wrap ${s.section}`}>
        <div className={s.head}>
          <h2 className={s.h2}>What a finished memory looks like</h2>
          <p>The same three inputs, read together. Switch between the example days to compare.</p>
        </div>
        <Transform entries={demos.map((e) => ({ ...e, owner: "" }))} />
      </section>

      <section className={`wrap ${s.section} ${s.split}`}>
        <div className={s.head}>
          <h2 className={s.h2}>Five styles, tuned to each day</h2>
          <p>Felt scores every entry against five styles, then adjusts colour, type, texture and motion to that specific day. It never picks a random template.</p>
        </div>
        <table className={s.styles}>
          <tbody>
            {STYLES.map(([name, text, when]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{text}</td>
                <td className={s.when}>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`wrap ${s.section}`}>
        <h2 className={s.h2}>Also included</h2>
        <ul className={s.features}>
          {FEATURES.map(([href, title, text]) => (
            <li key={title}>
              <Link href={href}>
                <h3>{title}</h3>
                <p>{text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {preview.length > 0 && (
        <section className={`wrap ${s.section}`}>
          <div className={s.rowHead}>
            <h2 className={s.h2}>{recent.length ? "Your recent entries" : "Example entries"}</h2>
            <Link href="/archive" className={s.textLink}>Open the archive →</Link>
          </div>
          <div className={s.cards}>
            {preview.map((e) => <MemoryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}

      <section className={`wrap ${s.section}`}>
        <div className={s.final}>
          <div>
            <h2 className={s.h2}>Start with today</h2>
            <p>It takes about two minutes. You can edit or delete any entry later.</p>
          </div>
          <Link href="/new" className="btn btn-primary">Write today’s entry</Link>
        </div>
      </section>
    </main>
  );
}
