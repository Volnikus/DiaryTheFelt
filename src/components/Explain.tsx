import type { Entry, Treatment } from "@/lib/types";
import { TREATMENT_LABEL } from "@/lib/theme";
import s from "./Memory.module.css";

const GROUPS = [
  { key: "text", label: "From the words" },
  { key: "image", label: "From the photographs" },
  { key: "music", label: "From the music" },
] as const;

export function Explain({ entry }: { entry: Entry }) {
  const a = entry.analysis;
  const d = entry.design;
  const dims: [string, number][] = [
    ["Lightness", (a.valence + 1) / 2],
    ["Energy", a.arousal],
    ["Nostalgia", a.nostalgia],
    ["Tension", a.tension],
    ["Togetherness", a.togetherness],
    ["Warmth", a.warmth],
  ];
  const photoColours = entry.photos.flatMap((p) => p.analysis.palette.slice(0, 2).map((c) => c.hex)).slice(0, 8);
  const scores = Object.entries(d.treatmentScores) as [Treatment, number][];
  const max = Math.max(...scores.map(([, v]) => v), 0.01);

  return (
    <section className={`cv ${s.explain}`}>
      <div className={s.explainHead}>
        <p className={s.kicker}>How this day became this memory</p>
        <h2 className={s.explainTitle}>Every visual choice has a reason.</h2>
      </div>

      <div className={s.explainGrid}>
        {GROUPS.map((g) => (
          <div key={g.key} className={s.explainCol}>
            <h3>{g.label}</h3>
            <ul>
              {d.explanations.filter((x) => x.group === g.key).map((x, i) => (
                <li key={i}>
                  <span className={s.exIn}>{x.input}</span>
                  <span className={s.exOut}>→ {x.decision}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={s.readouts}>
        <div>
          <h3>Atmosphere reading</h3>
          {dims.map(([k, v]) => (
            <div key={k} className={s.bar}>
              <span>{k}</span>
              <i><b style={{ width: `${Math.round(v * 100)}%` }} /></i>
            </div>
          ))}
          <p className={s.small}>
            {a.timeOfDay !== "unknown" && <>Time: {a.timeOfDay.replace("-", " ")} · </>}
            {a.season !== "unknown" && <>Season: {a.season} · </>}
            Pace: {a.pacing}
            {a.motifs.length > 0 && <> · Motifs: {a.motifs.join(", ")}</>}
          </p>
        </div>
        <div>
          <h3>Colour</h3>
          <p className={s.small}>Taken from the photographs</p>
          <div className={s.chips}>{photoColours.map((c, i) => <i key={i} style={{ background: c }} title={c} />)}</div>
          <p className={s.small}>Developed into</p>
          <div className={s.chips}>
            {[d.palette.ground, d.palette.surface, d.palette.ink, d.palette.accent, d.palette.accent2, d.palette.glow].map((c, i) => <i key={i} style={{ background: c }} title={c} />)}
          </div>
        </div>
        <div>
          <h3>Treatment</h3>
          {scores.map(([k, v]) => (
            <div key={k} className={`${s.bar} ${k === d.treatment ? s.barOn : ""}`}>
              <span>{TREATMENT_LABEL[k]}</span>
              <i><b style={{ width: `${Math.max(2, Math.round((Math.max(0, v) / max) * 100))}%` }} /></i>
            </div>
          ))}
        </div>
      </div>

      <div className={s.generation}>
        <p>
          Entry read by Felt’s lexicon interpreter
          {" · "}photographs analysed pixel by pixel{" · "}
          {entry.musicProfile.origin === "audio-analysis" ? "music analysed from the audio signal" : entry.musicProfile.origin === "preview-analysis" ? "music analysed from the song’s official preview" : entry.musicProfile.origin === "creator-tapped" ? "tempo tapped by the author" : "music character assumed from the entry"}
          {" · "}{entry.generation.engine}
        </p>
        {entry.generation.notes.map((n, i) => <p key={i}>{n}</p>)}
        <p>These readings describe atmosphere for art direction. They are not a psychological or medical assessment.</p>
      </div>
    </section>
  );
}
