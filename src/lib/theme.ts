import type { CSSProperties } from "react";
import type { MemoryDesign } from "./types";

export function designVars(d: MemoryDesign): CSSProperties {
  const p = d.palette;
  return {
    "--m-ground": p.ground,
    "--m-surface": p.surface,
    "--m-ink": p.ink,
    "--m-muted": p.muted,
    "--m-accent": p.accent,
    "--m-accent2": p.accent2,
    "--m-glow": p.glow,
    "--m-filter": d.image.filter,
    "--m-vignette": String(d.image.vignette),
    "--m-grain": String(d.texture.grain),
    "--m-paper": String(d.texture.paper),
    "--m-leak": String(d.texture.leak),
    "--m-scan": String(d.texture.scanlines),
    "--m-beat": `${d.motion.beatMs}ms`,
    "--m-cut": `${d.motion.beatMs * d.motion.beatsPerCut}ms`,
    "--m-ease": d.motion.easing,
    "--m-tilt": `${d.composition.tilt}deg`,
    "--m-light": `${d.light.angle}deg`,
    "--m-focus-x": `${Math.round(d.composition.focusX * 100)}%`,
    "--m-focus-y": `${Math.round(d.composition.focusY * 100)}%`,
    "--m-light-x": `${Math.round(50 + Math.cos((d.light.angle * Math.PI) / 180) * 32)}%`,
    "--m-light-y": `${Math.round(42 + Math.sin((d.light.angle * Math.PI) / 180) * 22)}%`,
    "--m-light-strength": String(d.light.intensity),
    background: p.ground,
    color: p.ink,
  } as CSSProperties;
}

export function titleStyle(d: MemoryDesign, size?: string): CSSProperties {
  const t = d.type;
  return {
    fontFamily: t.family === "mono" ? "var(--font-mono)" : "var(--font-display)",
    fontStyle: "normal",
    fontWeight: t.family === "serif" ? 250 : t.family === "mono" ? 500 : t.weight,
    letterSpacing: t.family === "serif" ? "-0.035em" : t.family === "grotesk" ? "-0.045em" : `${t.tracking}em`,
    textTransform: t.uppercase ? "uppercase" : "none",
    lineHeight: t.family === "serif" ? 0.98 : t.family === "mono" ? 1.02 : 0.9,
    fontSize: size,
  };
}

export const TREATMENT_LABEL: Record<MemoryDesign["treatment"], string> = {
  film: "Film memory",
  editorial: "Editorial",
  collage: "Collage",
  minimal: "Minimal",
  abstract: "Abstract signal",
};

export function formatDay(day: string, style: "long" | "short" = "long") {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString("en-GB", style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
}
