import type { CSSProperties, ReactNode } from "react";
import s from "./Sketch.module.css";

/*
 * The notebook's hand-drawn kit. Everything is plain SVG drawn with a pen:
 * lines wobble a little (filter #felt-rough), strokes draw themselves in,
 * and the mood of the day arrives as a watercolour stain.
 */

/** Shared SVG filters — rendered once in the layout. */
export function SketchDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        {/* a pen line that isn't perfectly straight */}
        <filter id="felt-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
        {/* paint that bleeds into the paper */}
        <filter id="felt-watercolor" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="46" result="bleed" />
          <feGaussianBlur in="bleed" stdDeviation="6" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="2" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.25" result="speckle" />
          <feComposite in="soft" in2="speckle" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/** A pen underline that draws itself under the text. */
export function Underline({ children, color = "var(--pen)", delay = 0 }: { children: ReactNode; color?: string; delay?: number }) {
  return (
    <span className={s.under}>
      {children}
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden style={{ "--delay": `${delay}ms` } as CSSProperties}>
        <path d="M3 9 C 40 4, 80 12, 120 7 S 180 5, 197 8" stroke={color} />
        <path d="M14 12 C 60 9, 110 13, 186 10" stroke={color} className={s.second} />
      </svg>
    </span>
  );
}

/** A loose ink ring drawn around a word. */
export function Circled({ children, color = "var(--pen)" }: { children: ReactNode; color?: string }) {
  return (
    <span className={s.circled}>
      {children}
      <svg viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden>
        <path d="M62 6 C 22 4, 4 18, 6 32 C 8 50, 40 56, 70 54 C 104 52, 118 40, 114 24 C 110 10, 84 3, 52 8" stroke={color} />
      </svg>
    </span>
  );
}

/** A curved arrow pointing somewhere, as in a margin note. */
export function Arrow({ direction = "right", className, style }: { direction?: "right" | "left" | "down"; className?: string; style?: CSSProperties }) {
  const d = direction === "down"
    ? "M20 4 C 8 30, 30 46, 22 74 M12 62 L22 76 L32 64"
    : "M4 34 C 30 4, 70 6, 96 26 M84 16 L97 27 L82 33";
  return (
    <svg
      viewBox={direction === "down" ? "0 0 44 80" : "0 0 100 44"}
      className={`${s.arrow} ${className ?? ""}`}
      style={{ ...style, transform: direction === "left" ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/** Watercolour stain in the colour of the day. Put it in a position:relative parent. */
export function Watercolor({ color = "var(--accent)", className, style, shape = 0 }: { color?: string; className?: string; style?: CSSProperties; shape?: 0 | 1 | 2 }) {
  const shapes = [
    "M120 40 C 190 20, 270 60, 260 130 C 250 200, 170 240, 100 220 C 40 200, 10 140, 40 90 C 60 60, 80 50, 120 40 Z",
    "M90 50 C 150 10, 260 30, 270 110 C 280 190, 200 250, 120 230 C 60 215, 20 160, 30 110 C 38 80, 60 66, 90 50 Z",
    "M140 30 C 220 40, 280 110, 240 180 C 210 230, 120 250, 70 200 C 30 160, 30 90, 70 60 C 90 44, 110 30, 140 30 Z",
  ];
  return (
    <svg viewBox="0 0 300 270" className={`${s.wash} ${className ?? ""}`} style={style} aria-hidden>
      <g filter="url(#felt-watercolor)">
        <path d={shapes[shape]} style={{ fill: color, transition: "fill 3s ease" }} opacity="0.7" />
        <path d={shapes[(shape + 1) % 3]} style={{ fill: color, transition: "fill 3s ease" }} opacity="0.42" transform="translate(30 20) scale(0.8)" />
      </g>
    </svg>
  );
}

/** Small margin doodles. */
export function Doodle({ kind, className, style }: { kind: "star" | "sun" | "heart" | "spark" | "cloud"; className?: string; style?: CSSProperties }) {
  const paths: Record<typeof kind, string> = {
    star: "M24 4 L29 18 L44 18 L32 27 L37 42 L24 33 L11 42 L16 27 L4 18 L19 18 Z",
    sun: "M24 14 a10 10 0 1 0 0.1 0 M24 2 V8 M24 40 V46 M2 24 H8 M40 24 H46 M8 8 L12 12 M36 36 L40 40 M40 8 L36 12 M8 40 L12 36",
    heart: "M24 42 C 6 28, 2 16, 10 9 C 17 3, 24 9, 24 14 C 24 9, 31 3, 38 9 C 46 16, 42 28, 24 42 Z",
    spark: "M24 4 C 26 18, 30 22, 44 24 C 30 26, 26 30, 24 44 C 22 30, 18 26, 4 24 C 18 22, 22 18, 24 4 Z",
    cloud: "M12 36 C 4 36, 3 26, 10 24 C 9 15, 20 11, 25 17 C 28 9, 42 11, 41 21 C 48 22, 47 36, 38 36 Z",
  };
  return (
    <svg viewBox="0 0 48 48" className={`${s.doodle} ${className ?? ""}`} style={style} aria-hidden>
      <path d={paths[kind]} />
    </svg>
  );
}
