import type { DayMood } from "./types";

// Every mouth has the same cubic structure, so the pen line can morph between them.
export const MOUTH: Record<DayMood, string> = {
  radiant: "M44 74 C 50 88, 70 88, 76 74",
  bright: "M47 76 C 53 84, 67 84, 73 76",
  calm: "M49 79 C 55 81, 65 81, 71 78",
  mixed: "M47 79 C 54 74, 61 84, 73 77",
  low: "M48 82 C 54 76, 66 76, 72 82",
  stormy: "M46 84 C 53 74, 67 74, 74 84",
  blank: "M51 79 C 56 79, 64 79, 69 79",
};
export const BROW: Record<DayMood, [string, string]> = {
  radiant: ["M38 44 Q 45 39 52 43", "M68 43 Q 75 39 82 44"],
  bright: ["M39 45 Q 45 42 51 45", "M69 45 Q 75 42 81 45"],
  calm: ["M39 47 Q 45 46 51 47", "M69 47 Q 75 46 81 47"],
  mixed: ["M39 44 Q 45 42 51 46", "M69 47 Q 75 44 81 45"],
  low: ["M39 45 Q 45 47 51 49", "M69 49 Q 75 47 81 45"],
  stormy: ["M39 42 Q 46 46 52 50", "M68 50 Q 74 46 81 42"],
  blank: ["M40 47 Q 45 46 50 47", "M70 47 Q 75 46 80 47"],
};

