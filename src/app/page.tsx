import Link from "next/link";
import { Equalizer, Typewriter } from "@/components/Alive";
import { Icon } from "@/components/Icon";
import { MemoryCard } from "@/components/MemoryCard";
import { Playground } from "@/components/Playground";
import { Transform } from "@/components/Transform";
import { repo } from "@/lib/server/db";
import { currentOwnerOrNull } from "@/lib/server/owner";
import { getDemoEntries } from "@/lib/server/seed";
import s from "./page.module.css";

const TREATMENTS = [
  ["Film memory", "Faded prints, warm grain, a date burned into the corner, slow dissolves.", "For days that already feel like the past"],
  ["Editorial", "One strong photograph, a quiet column of type, generous space.", "For clear, composed days"],
  ["Collage", "Prints scattered and taped down, bold type, cuts on the beat.", "For crowded, loud, shared days"],
  ["Minimal", "One small image, a lot of air, the slowest motion.", "For still days spent alone"],
  ["Abstract signal", "Monochrome photographs, a scanning grid, timecode, hard cuts.", "For pressure and late nights"],
];

export default async function Home() {
  const owner = await currentOwnerOrNull();
  const demos = await getDemoEntries();
  const all = owner ? await repo.list(owner, {}) : [];
  const recent = all.filter((e) => !e.demo).slice(0, 3);
  const preview = recent.length ? recent : all.slice(0, 3);
  const words = demos.flatMap((d) => [...d.analysis.feelings.slice(0, 3), `${d.musicProfile.bpm} bpm`, d.analysis.timeOfDay.replace("-", " "), ...d.analysis.motifs.slice(0, 2)]).filter((w) => w && w !== "unknown");
  const swatches = demos.flatMap((d) => d.photos.slice(0, 2).flatMap((p) => p.analysis.palette.slice(0, 3).map((c) => c.hex))).slice(0, 14);
  const sample = demos.find((d) => d.id.startsWith("demo-autumn")) ?? demos[0];

  return (
    <main>
      <Playground />

      {words.length > 0 && (
        <div className={s.marquee} aria-hidden>
          <div className={s.track}>
            {[...words, ...words, ...words].map((w, i) => <span key={i}>{w}</span>)}
          </div>
        </div>
      )}

      <section className={`wrap cv ${s.develop}`}>
        <div className={s.sectionHead}>
          <p className="meta section-label">watch a day develop</p>
          <h2 className={`display ${s.h2}`}>words, photographs, a song — <em>one memory.</em></h2>
        </div>
        <div className={s.heroDemo}>
          <Transform entries={demos.map((e) => ({ ...e, owner: "" }))} />
        </div>
      </section>

      <section className={`wrap cv ${s.how}`}>
        <div className={s.sectionHead}>
          <h2 className={`display ${s.h2}`}>Three inputs. <em>One atmosphere.</em></h2>
        </div>
        <div className={s.cols}>
          <article className={`glass reveal ${s.card}`}>
            <span className={s.step}><Icon name="pen" /></span>
            <h3>Write the day</h3>
            <p>Time, weather, who was there, how heavy it felt. The words set the light, the pace and the type.</p>
            <div className={s.demoBox}>
              <Typewriter text={sample ? sample.text.split(". ").slice(0, 2).join(". ") + "." : "We walked through the park after lunch…"} />
              <div className={s.chips}>
                {(sample?.analysis.feelings ?? ["wistful", "warm"]).slice(0, 3).map((f) => <span key={f} className="chip">{f}</span>)}
              </div>
            </div>
          </article>
          <article className={`glass reveal ${s.card}`}>
            <span className={s.step}><Icon name="image" /></span>
            <h3>Add your photos</h3>
            <p>Each photo is read pixel by pixel — its colours, brightness and focus become the memory’s palette.</p>
            <div className={s.demoBox}>
              <div className={s.swatchWave}>
                {swatches.map((c, i) => <i key={i} style={{ background: c, animationDelay: `${i * 90}ms` }} />)}
              </div>
            </div>
          </article>
          <article className={`glass reveal ${s.card}`}>
            <span className={s.step}><Icon name="music" /></span>
            <h3>Pick the song</h3>
            <p>Felt hears the tempo, energy and key. The beat times every cut, pulse and transition.</p>
            <div className={s.demoBox}>
              <Equalizer bpm={sample?.musicProfile.bpm ?? 96} />
              <span className="meta">{sample ? `${sample.musicProfile.bpm} bpm · ${sample.musicProfile.key ?? sample.musicProfile.mode}` : "tempo · energy · key"}</span>
            </div>
          </article>
        </div>
      </section>

      <section className={`wrap cv ${s.treatments}`}>
        <div className={s.sectionHead}>
          <h2 className={`display ${s.h2}`}>Five ways a day can <em>develop.</em></h2>
          <p className="muted">Every memory scores all five against its inputs, then tunes palette, type, texture, light and motion — so no two days look alike.</p>
        </div>
        <ol className={s.treatList}>
          {TREATMENTS.map(([name, text, when], i) => (
            <li key={name} className={`glass reveal ${s.treat}`}>
              <span className={s.num}>0{i + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{text}</p>
              </div>
              <span className={s.when}>{when}</span>
            </li>
          ))}
        </ol>
      </section>

      {preview.length > 0 && (
        <section className={`wrap cv ${s.archive}`}>
          <div className={s.archiveHead}>
            <div className={s.sectionHead}>
              <h2 className={`display ${s.h2}`}>{recent.length ? "Recently developed" : "Open a memory"}</h2>
            </div>
            <Link href="/archive" className="btn">See every day →</Link>
          </div>
          <div className={s.cards}>
            {preview.map((e) => <MemoryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}

      <section className={`wrap cv ${s.principles}`}>
        {[
          ["lock", "Private by default", "Each browser gets its own diary key. Entries, photos and audio are only served back to it."],
          ["spark", "Explainable", "Every memory shows which words, colours and beats led to which visual choices."],
          ["leaf", "Atmosphere, not diagnosis", "Moods guide the art direction only — never an assessment of anyone’s health."],
          ["headphones", "Your music, played properly", "Upload a track you own, or link Spotify, YouTube, SoundCloud or Apple Music."],
        ].map(([icon, title, text]) => (
          <div key={title} className={`glass reveal ${s.principle}`}>
            <span className={s.icon}><Icon name={icon} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="wrap">
        <div className={`glass reveal ${s.final}`}>
          <span className={s.finalGlow} aria-hidden />
          <h2 className={`display ${s.h2}`}>How did today <em>feel?</em></h2>
          <p className="lede">It takes about two minutes. Your first memory is waiting.</p>
          <Link href="/new" className="btn btn-primary">Start writing →</Link>
        </div>
      </section>
    </main>
  );
}
