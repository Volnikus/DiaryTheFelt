"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, useState } from "react";
import type { EntrySummary } from "@/lib/types";
import { MemoryCard } from "./MemoryCard";
import { Circled } from "./Sketch";
import s from "./StoryScroll.module.css";

interface Props {
  lines: string[];
  photos: string[];
  envelope: number[];
  bpm: number;
  keyLabel: string;
  memory: EntrySummary;
}

const STEPS = [
  { title: "Write the day", text: "Where you were, who was there, how heavy it felt. The words set the pace, the light and the handwriting." },
  { title: "Tape in your photos", text: "Each photo is read for colour, light and focus. Its colours become the paint of the memory." },
  { title: "Add the song", text: "Let Nimbus pick one, search, upload a file or paste a link. Its tempo times every cut." },
  { title: "Keep the memory", text: "Felt develops the page into a short animated memory and keeps it in your private archive." },
];

/** A notebook page that holds still while you scroll, and fills itself in: words, photos, a song, then the memory. */
export function StoryScroll({ lines, photos, envelope, bpm, keyLabel, memory }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setStep(v < 0.24 ? 0 : v < 0.5 ? 1 : v < 0.72 ? 2 : 3));

  if (reduce) {
    return (
      <section ref={ref} className={`wrap ${s.static}`}>
        <Header />
        <ol className={s.staticSteps}>
          {STEPS.map((st, i) => (
            <li key={st.title}><span className={s.num}><Circled>{i + 1}</Circled></span><h3>{st.title}</h3><p>{st.text}</p></li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section ref={ref} className={s.story} aria-label="How a page becomes a memory">
      <div className={s.pin}>
        <div className={`wrap ${s.grid}`}>
          <div className={s.copy}>
            <Header />
            <ol className={s.steps}>
              {STEPS.map((st, i) => (
                <li key={st.title} data-on={i === step || undefined} data-done={i < step || undefined}>
                  <span className={s.num}>{i === step ? <Circled key={`c${step}`}>{i + 1}</Circled> : i + 1}</span>
                  <div>
                    <h3>{st.title}</h3>
                    <motion.p initial={false} animate={{ opacity: i === step ? 1 : 0, height: i === step ? "auto" : 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      {st.text}
                    </motion.p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Stage p={scrollYProgress} lines={lines} photos={photos} envelope={envelope} bpm={bpm} keyLabel={keyLabel} memory={memory} />
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <>
      <p className="section-label">How it works</p>
      <h2 className={`display ${s.h2}`}>From a page to a memory</h2>
    </>
  );
}

function Stage({ p, lines, photos, envelope, bpm, keyLabel, memory }: { p: MotionValue<number> } & Omit<Props, never>) {
  // the page itself gets a little smaller and steps back as it turns into the memory
  const pageScale = useTransform(p, [0.7, 0.9], [1, 0.9]);
  const pageRotate = useTransform(p, [0.7, 0.92], [0, -4]);
  const pageFilter = useTransform(p, [0.72, 0.9], ["blur(0px)", "blur(1.5px)"]);
  const pageOpacity = useTransform(p, [0.8, 0.95], [1, 0.35]);
  // the memory is tossed on top and lands square
  const memY = useTransform(p, [0.74, 0.92], [520, 0]);
  const memRotate = useTransform(p, [0.74, 0.92], [14, 2]);
  const memOpacity = useTransform(p, [0.74, 0.8], [0, 1]);

  return (
    <div className={s.stage}>
      <motion.div className={`grid-paper ${s.page}`} style={{ scale: pageScale, rotate: pageRotate, filter: pageFilter, opacity: pageOpacity }}>
        <div className={s.lines}>
          {lines.map((line, i) => <WrittenLine key={i} p={p} from={0.02 + i * 0.06} to={0.08 + i * 0.06} text={line} />)}
        </div>
        <div className={s.photos}>
          {photos.slice(0, 3).map((src, i) => <TapedPhoto key={src} p={p} i={i} src={src} />)}
        </div>
        <SongStrip p={p} envelope={envelope} bpm={bpm} keyLabel={keyLabel} />
      </motion.div>

      <motion.div className={s.memory} style={{ y: memY, rotate: memRotate, opacity: memOpacity }}>
        <span className={`tape ${s.memTape}`} aria-hidden />
        <MemoryCard entry={memory} />
      </motion.div>
    </div>
  );
}

/** a line of handwriting that appears left to right, like ink */
function WrittenLine({ p, from, to, text }: { p: MotionValue<number>; from: number; to: number; text: string }) {
  const reveal = useTransform(p, [from, to], [100, 0]);
  const clip = useTransform(reveal, (r) => `inset(0 ${r}% 0 0)`);
  return <motion.p className={s.line} style={{ clipPath: clip }}>{text}</motion.p>;
}

/** a print flies in, lands crooked, and a strip of tape presses it down */
function TapedPhoto({ p, i, src }: { p: MotionValue<number>; i: number; src: string }) {
  const a = 0.26 + i * 0.06, b = a + 0.1;
  const tilt = [-6, 4, -2][i];
  const x = useTransform(p, [a, b], [240 + i * 40, 0]);
  const y = useTransform(p, [a, b], [-160 + i * 30, 0]);
  const rotate = useTransform(p, [a, b], [tilt + 18, tilt]);
  const opacity = useTransform(p, [a, a + 0.03], [0, 1]);
  const tape = useTransform(p, [b - 0.01, b + 0.02], [0, 1]);
  const tapeScale = useTransform(tape, [0, 1], [0.6, 1]);
  return (
    <motion.figure className={s.photo} style={{ x, y, rotate, opacity }}>
      <motion.span className={`tape ${s.photoTape}`} style={{ opacity: tape, scaleX: tapeScale }} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" />
    </motion.figure>
  );
}

/** the song arrives as a strip of tape with its waveform drawn on it */
function SongStrip({ p, envelope, bpm, keyLabel }: { p: MotionValue<number>; envelope: number[]; bpm: number; keyLabel: string }) {
  const opacity = useTransform(p, [0.52, 0.56], [0, 1]);
  const grow = useTransform(p, [0.53, 0.68], [0, 1]);
  const bars = envelope.filter((_, i) => i % 2 === 0).slice(0, 30);
  return (
    <motion.div className={s.song} style={{ opacity }}>
      <div className={s.bars}>
        {bars.map((v, i) => <Bar key={i} grow={grow} i={i} n={bars.length} v={v} />)}
      </div>
      <span className={s.songMeta}>{bpm} bpm · {keyLabel}</span>
    </motion.div>
  );
}

function Bar({ grow, i, n, v }: { grow: MotionValue<number>; i: number; n: number; v: number }) {
  const scaleY = useTransform(grow, [i / n * 0.7, i / n * 0.7 + 0.3], [0.05, Math.max(0.15, v)]);
  return <motion.i style={{ scaleY }} />;
}
