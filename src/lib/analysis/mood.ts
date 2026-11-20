// Word-combination mood counter.
// Reads the day token by token and scores each emotional word, but the score
// depends on its neighbours: negations flip it ("not happy"), intensifiers
// amplify it ("so tired"), softeners damp it ("a bit sad"), and some fixed
// two-word phrases carry their own meaning ("not bad", "fell apart").

export interface MoodHit {
  word: string;
  phrase: string;
  score: number;
  index: number;
}

export interface MoodCount {
  positive: number;
  negative: number;
  /** -1 … 1 balance of the day */
  balance: number;
  /** 0 … 1 how emotionally loaded the text is */
  charge: number;
  hits: MoodHit[];
  mood: "radiant" | "bright" | "calm" | "mixed" | "low" | "stormy" | "blank";
}

const POSITIVE: Record<string, number> = {
  happy: 1, happiness: 1, joy: 1.2, joyful: 1.2, glad: 0.8, love: 1.2, loved: 1.2, lovely: 1, beautiful: 1, wonderful: 1.2,
  amazing: 1.2, great: 0.9, good: 0.7, nice: 0.6, fun: 0.9, laugh: 1, laughed: 1, laughing: 1, smile: 0.9, smiled: 0.9,
  calm: 0.7, peaceful: 0.9, relaxed: 0.8, cozy: 0.8, cosy: 0.8, warm: 0.6, proud: 1, excited: 1, grateful: 1.1, thankful: 1.1,
  free: 0.7, bright: 0.6, sunny: 0.6, delicious: 0.8, best: 1, perfect: 1.1, won: 1, win: 0.9, success: 1, finished: 0.6,
  friends: 0.5, hug: 0.9, together: 0.5, hope: 0.7, hopeful: 0.8, inspired: 1, energized: 0.9, rested: 0.7, safe: 0.7,
  awesome: 1.1, cool: 0.5, sweet: 0.6, kind: 0.7, enjoy: 0.9, enjoyed: 0.9, celebrate: 1, celebrated: 1, easy: 0.4,
};

const NEGATIVE: Record<string, number> = {
  sad: 1, unhappy: 1, cry: 1.1, cried: 1.1, crying: 1.1, tired: 0.7, exhausted: 1, angry: 1.1, mad: 0.9, upset: 1,
  stressed: 1, stress: 0.9, anxious: 1, anxiety: 1, worried: 0.9, worry: 0.8, scared: 1, afraid: 1, lonely: 1.1, alone: 0.6,
  bad: 0.8, awful: 1.2, terrible: 1.2, horrible: 1.2, hate: 1.2, hated: 1.2, boring: 0.7, bored: 0.7, sick: 0.9, ill: 0.8,
  pain: 1, hurt: 1, hurts: 1, failed: 1.1, fail: 1, lost: 0.8, lose: 0.8, broke: 0.8, broken: 0.9, rain: 0.2, grey: 0.3,
  gray: 0.3, cold: 0.3, late: 0.4, deadline: 0.5, exam: 0.4, argue: 0.9, argued: 0.9, fight: 1, fought: 1, annoyed: 0.8,
  annoying: 0.8, frustrated: 1, nervous: 0.8, heavy: 0.6, miss: 0.6, missed: 0.6, sorry: 0.5, ugly: 0.8, worst: 1.2,
};

const NEGATIONS = new Set(["not", "no", "never", "nothing", "hardly", "barely", "without", "neither", "nor", "isn't", "wasn't", "don't", "didn't", "doesn't", "can't", "couldn't", "won't", "wouldn't", "aren't", "weren't"]);
const INTENSIFIERS: Record<string, number> = { very: 1.5, so: 1.4, really: 1.4, super: 1.5, extremely: 1.8, totally: 1.4, completely: 1.5, absolutely: 1.6, incredibly: 1.7, too: 1.3, truly: 1.4, deeply: 1.5, most: 1.3 };
const SOFTENERS: Record<string, number> = { bit: 0.55, little: 0.6, slightly: 0.5, kinda: 0.6, somewhat: 0.6, almost: 0.6, quite: 0.85, rather: 0.8 };

// Fixed combinations that mean something other than their parts.
const PHRASES: [RegExp, number][] = [
  [/\bnot (?:that |too )?bad\b/g, 0.6],
  [/\bnot (?:that |too )?(?:hard|difficult)\b/g, 0.5],
  [/\bfell apart\b/g, -1.2],
  [/\bgave up\b/g, -0.9],
  [/\bfreaked out\b/g, -1],
  [/\bburn(?:ed|t)? out\b/g, -1.1],
  [/\bfeel(?:ing)? down\b/g, -0.9],
  [/\bcheered (?:me )?up\b/g, 1],
  [/\bmade my day\b/g, 1.4],
  [/\bcan'?t wait\b/g, 1],
  [/\bat (?:long )?last\b/g, 0.6],
  [/\bfinally\b/g, 0.5],
  [/\bon top of the world\b/g, 1.5],
  [/\bbest day\b/g, 1.4],
  [/\bworst day\b/g, -1.4],
];

const tokenize = (text: string) => text.toLowerCase().replace(/[’']/g, "'").match(/[a-zà-ÿ0-9']+/g) ?? [];

export function countMood(text: string): MoodCount {
  const lower = text.toLowerCase().replace(/[’]/g, "'");
  const tokens = tokenize(text);
  const hits: MoodHit[] = [];
  const claimed = new Set<number>();

  // 1. Phrases first, so their words are not double-counted.
  for (const [re, score] of PHRASES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      const before = tokenize(lower.slice(0, m.index)).length;
      const len = tokenize(m[0]).length;
      for (let k = 0; k < len; k++) claimed.add(before + k);
      hits.push({ word: m[0], phrase: m[0], score, index: before });
    }
  }

  // 2. Single words, shaped by up to three words before them.
  tokens.forEach((tok, i) => {
    if (claimed.has(i)) return;
    const base = POSITIVE[tok] ?? (NEGATIVE[tok] !== undefined ? -NEGATIVE[tok] : 0);
    if (!base) return;
    let score = base;
    const window = tokens.slice(Math.max(0, i - 3), i);
    let phrase = tok;
    let negated = false;
    for (let w = window.length - 1; w >= 0; w--) {
      const p = window[w];
      if (/[.!?]/.test(p)) break;
      if (NEGATIONS.has(p) || p.endsWith("n't")) { negated = !negated; phrase = `${window.slice(w).join(" ")} ${tok}`; }
      else if (INTENSIFIERS[p] && w === window.length - 1) { score *= INTENSIFIERS[p]; phrase = `${p} ${tok}`; }
      else if (SOFTENERS[p] && w >= window.length - 2) { score *= SOFTENERS[p]; phrase = `${window.slice(w).join(" ")} ${tok}`; }
    }
    // "not happy" is less negative than "sad"; "not sad" is mildly positive.
    if (negated) score = -score * 0.6;
    hits.push({ word: tok, phrase, score: Math.round(score * 100) / 100, index: i });
  });

  hits.sort((a, b) => a.index - b.index);
  const positive = hits.filter((h) => h.score > 0).length;
  const negative = hits.filter((h) => h.score < 0).length;
  const sum = hits.reduce((acc, h) => acc + h.score, 0);
  const mass = hits.reduce((acc, h) => acc + Math.abs(h.score), 0);
  const balance = mass ? Math.tanh(sum / Math.sqrt(mass + 1)) : 0;
  const charge = Math.min(1, mass / Math.max(6, tokens.length * 0.18));

  let mood: MoodCount["mood"] = "blank";
  if (hits.length) {
    if (positive && negative && Math.abs(balance) < 0.25) mood = "mixed";
    else if (balance > 0.6) mood = charge > 0.5 ? "radiant" : "bright";
    else if (balance > 0.15) mood = "bright";
    else if (balance < -0.6) mood = charge > 0.5 ? "stormy" : "low";
    else if (balance < -0.15) mood = "low";
    else mood = "calm";
  }
  return { positive, negative, balance: Math.round(balance * 100) / 100, charge: Math.round(charge * 100) / 100, hits, mood };
}
