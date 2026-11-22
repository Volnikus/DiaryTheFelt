"use client";

import { useMemo } from "react";
import { countMood } from "@/lib/analysis/mood";
import { MoodDoodle } from "./MoodDoodle";
import s from "./PeekingMote.module.css";

/** Mote peeks over the top of the last card, watching the pointer — tap it to tickle. */
export function PeekingMote() {
  const mood = useMemo(() => countMood("such a lovely happy day"), []);
  return (
    <span className={s.peek}>
      <MoodDoodle mood={mood} color="#FFC857" size={112} follow />
    </span>
  );
}
