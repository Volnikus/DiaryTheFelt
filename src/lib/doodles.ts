/*
 * Margin doodles: small ballpoint drawings that appear in the notebook margin when the
 * words of the day mention something drawable. Each doodle is a few strokes in a 48×48
 * box; the strokes are drawn one after another, like a pen would.
 * Word stems are matched at the start of a word, in English, Russian and Kazakh.
 */

export interface Doodle {
  id: string;
  paths: string[];
  stems: string[];
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;

export const DOODLES: Doodle[] = [
  {
    id: "sun",
    paths: [circle(24, 24, 9), "M24 5 L24 10", "M24 38 L24 43", "M5 24 L10 24", "M38 24 L43 24", "M10.5 10.5 L14 14", "M34 34 L37.5 37.5", "M37.5 10.5 L34 14", "M14 34 L10.5 37.5"],
    stems: ["sun", "sunny", "sunset", "sunrise", "солн", "закат", "рассвет", "күн сәулесі"],
  },
  {
    id: "rain",
    paths: ["M13 28 C7 28 6 20 12 19 C12 12 21 10 24 15 C27 9 37 11 36 19 C42 19 42 28 36 28 Z", "M15 33 L13 38", "M23 33 L21 39", "M31 33 L29 38"],
    stems: ["rain", "storm", "drizzl", "umbrell", "дожд", "ливен", "ливн", "гроз", "зонт", "жаңбыр"],
  },
  {
    id: "coffee",
    paths: ["M11 20 L13 37 C13.5 40 16 41 18 41 L28 41 C30 41 32.5 40 33 37 L35 20 Z", "M35 24 C41 23 42 32 34 33", "M18 15 C16 12 20 10 18 6", "M26 15 C24 12 28 10 26 6"],
    stems: ["coffee", "tea ", "latte", "cocoa", "cafe", "café", "кофе", "чай", "чая", "какао", "кафе", "шай", "кофе"],
  },
  {
    id: "sea",
    paths: ["M4 18 C8 13 12 13 16 18 C20 23 24 23 28 18 C32 13 36 13 40 18 C42 20 44 20 45 19", "M4 28 C8 23 12 23 16 28 C20 33 24 33 28 28 C32 23 36 23 40 28 C42 30 44 30 45 29", "M10 38 C14 34 18 34 22 38 C26 42 30 42 34 38"],
    stems: ["sea ", "seaside", "beach", "ocean", "wave", "swim", "lake", "river", "coast", "море", "морем", "моря", "морск", "пляж", "океан", "волн", "плав", "озер", "река", "реки", "реку", "речк", "теңіз", "көл"],
  },
  {
    id: "tree",
    paths: ["M24 28 C12 30 8 20 14 15 C13 7 23 4 27 9 C34 6 41 13 37 19 C42 25 34 31 24 28", "M24 44 L24 28", "M24 35 L18 30", "M24 32 L30 27"],
    stems: ["tree", "park", "forest", "wood", "garden", "дерев", "парк", "лес ", "леса", "лесу", "лесн", "сад ", "саду", "сада ", "роща", "ағаш", "орман", "саябақ"],
  },
  {
    id: "leaf",
    paths: ["M10 38 C10 20 22 8 40 8 C40 26 28 38 10 38 Z", "M10 38 L31 17", "M19 29 L18 22", "M25 23 L31 24"],
    stems: ["leaf", "leaves", "autumn", "fall", "листв", "листья", "листоп", "осен", "күз", "жапырақ"],
  },
  {
    id: "cat",
    paths: ["M12 22 L12 10 L19 16 C22 15 26 15 29 16 L36 10 L36 22 C36 32 30 36 24 36 C18 36 12 32 12 22 Z", "M19 23.5 L19 25", "M29 23.5 L29 25", "M23 28 L25 28 L24 29.5 Z", "M7 27 L17 28", "M8 32 L17 30", "M41 27 L31 28", "M40 32 L31 30"],
    stems: ["cat", "kitten", "kitty", "кот ", "кота", "коту", "котом", "котик", "кошк", "кошеч", "котён", "котен", "мысық"],
  },
  {
    id: "dog",
    paths: ["M14 16 C14 10 34 10 34 16 L34 28 C34 36 14 36 14 28 Z", "M14 16 C8 16 6 26 11 28", "M34 16 C40 16 42 26 37 28", "M20 22 L20 23.5", "M28 22 L28 23.5", "M22 28 C22 26 26 26 26 28 C26 30 22 30 22 28", "M24 31 L24 34 C24 36 27 36 27 34"],
    stems: ["dog", "puppy", "walkies", "собак", "пёс", "пес ", "щен", "ит ", "күшік"],
  },
  {
    id: "heart",
    paths: ["M24 40 C10 30 6 22 8 16 C10 9 19 8 24 16 C29 8 38 9 40 16 C42 22 38 30 24 40 Z"],
    stems: ["love", "hug", "friend", "kiss", "sister", "brother", "mum", "mom", "family", "люб", "обня", "друг", "подруг", "сестр", "брат", "мам", "семь", "дос ", "досым", "достар", "махаббат", "отбас", "анам"],
  },
  {
    id: "star",
    paths: ["M24 6 L28.5 18 L41 18.5 L31 26.5 L34.5 39 L24 31.5 L13.5 39 L17 26.5 L7 18.5 L19.5 18 Z"],
    stems: ["star", "win ", "wins", "winning", "won ", "proud", "best", "award", "звезд", "звёзд", "побед", "горд", "лучш", "жұлдыз", "жеңіс"],
  },
  {
    id: "moon",
    paths: ["M30 8 C18 10 12 22 16 32 C20 42 34 44 40 36 C30 38 22 30 22 21 C22 15 25 11 30 8 Z", "M38 9 L38 15", "M35 12 L41 12"],
    stems: ["night", "moon", "sleep", "dream", "midnight", "ноч", "луна", "луну", "спат", "сон ", "сны", "сна ", "мечт", "түн", "ай ", "ұйқы"],
  },
  {
    id: "book",
    paths: ["M24 14 C18 10 10 10 6 12 L6 38 C10 36 18 36 24 40 C30 36 38 36 42 38 L42 12 C38 10 30 10 24 14 Z", "M24 14 L24 40", "M11 19 L19 20", "M11 25 L19 26", "M29 20 L37 19"],
    stems: ["book", "reading", "read ", "exam", "test", "study", "school", "lesson", "homework", "class", "книг", "чита", "экзам", "контрольн", "учёб", "учеб", "школ", "урок", "домашк", "кітап", "емтихан", "мектеп", "сабақ"],
  },
  {
    id: "note",
    paths: ["M18 36 C18 40 10 40 10 36 C10 32 18 32 18 36 L18 10 L38 6 L38 32", "M38 32 C38 36 30 36 30 32 C30 28 38 28 38 32", "M18 16 L38 12"],
    stems: ["song", "music", "sing", "concert", "guitar", "piano", "dance", "песн", "музык", "петь", "пою", "концерт", "гитар", "пиани", "танц", "ән ", "әнді", "би "],
  },
  {
    id: "pizza",
    paths: ["M8 12 C18 6 30 6 40 12 L24 42 Z", "M10 15 C19 10 29 10 38 15", circle(21, 20, 2.5), circle(28, 24, 2.5), circle(23, 31, 2)],
    stems: ["pizza", "lunch", "dinner", "breakfast", "food", "cook", "ate ", "пицц", "обед", "ужин", "завтрак", "еда ", "ели ", "готовил", "тамақ"],
  },
  {
    id: "snow",
    paths: ["M24 6 L24 42", "M8.4 15 L39.6 33", "M8.4 33 L39.6 15", "M20 9 L24 13 L28 9", "M20 39 L24 35 L28 39"],
    stems: ["snow", "winter", "cold", "frost", "mitten", "снег", "снеж", "зим", "холод", "мороз", "варежк", "қар", "қыс", "суық"],
  },
  {
    id: "flower",
    paths: ["M24 17 C19 7 29 7 24 17", "M27 20 C37 15 37 25 27 20", "M21 20 C11 15 11 25 21 20", "M26 23 C31 31 23 33 24 23", circle(24, 20, 3), "M24 24 C24 32 22 38 24 44", "M24 36 C29 31 34 33 34 33 C30 38 26 38 24 36"],
    stems: ["flower", "spring", "bloom", "rose", "цветы", "цветок", "цветоч", "цветов", "весн", "роз", "тюльпан", "гүл", "көктем"],
  },
  {
    id: "phone",
    paths: ["M15 6 L33 6 C35 6 36 7 36 9 L36 39 C36 41 35 42 33 42 L15 42 C13 42 12 41 12 39 L12 9 C12 7 13 6 15 6 Z", "M21 37 L27 37", "M20 10 L28 10"],
    stems: ["call", "phone", "texted", "message", "chat", "звон", "позвон", "телефон", "сообщен", "переписк", "чат", "қоңырау", "хабар"],
  },
  {
    id: "bike",
    paths: [circle(14, 32, 7), circle(34, 32, 7), "M14 32 L20 20 L30 20 L34 32", "M20 20 L24 32 L30 20", "M18 16 L23 16", "M30 20 L29 14 L33 14"],
    stems: ["bike", "cycle", "ride", "велик", "велосипед", "кататься", "катал", "велосипед"],
  },
  {
    id: "camera",
    paths: ["M8 16 L16 16 L19 11 L29 11 L32 16 L40 16 C41 16 42 17 42 18 L42 37 C42 38 41 39 40 39 L8 39 C7 39 6 38 6 37 L6 18 C6 17 7 16 8 16 Z", circle(24, 27, 7), "M35 21 L37 21"],
    stems: ["photo", "picture", "camera", "selfie", "фот", "снимк", "камер", "селфи", "сурет"],
  },
  {
    id: "house",
    paths: ["M8 22 L24 8 L40 22", "M12 19 L12 40 L36 40 L36 19", "M20 40 L20 30 L28 30 L28 40", "M31 14 L31 9 L35 9 L35 17"],
    stems: ["home", "house", "room", "bed", "дом", "квартир", "комнат", "кроват", "үй", "бөлме"],
  },
  {
    id: "laptop",
    paths: ["M10 12 L38 12 L38 32 L10 32 Z", "M5 32 L43 32 L40 38 L8 38 Z", "M18 19 L15 22 L18 25", "M30 19 L33 22 L30 25", "M25 18 L23 26"],
    stems: ["code", "coding", "laptop", "computer", "bug", "deadline", "work", "project", "код", "ноут", "компьют", "баг", "дедлайн", "работ", "проект", "жұмыс", "жоба"],
  },
  {
    id: "mountain",
    paths: ["M4 40 L18 16 L26 28 L32 20 L44 40", "M14 23 L18 16 L22 23 L19 21 L16 24"],
    stems: ["mountain", "hike", "hiking", "climb", "hill", "горы", "гора", "горах", "поход", "вершин", "холм", "тау", "шың"],
  },
  {
    id: "balloon",
    paths: ["M24 30 C14 30 12 18 14 13 C16 7 32 7 34 13 C36 18 34 30 24 30 Z", "M22 32 L26 32 L24 30 Z", "M24 32 C21 36 27 38 23 44", "M18 14 C18 12 20 11 21 11"],
    stems: ["birthday", "party", "celebrat", "gift", "present", "рожден", "праздн", "вечерин", "подар", "туған күн", "мереке", "сыйлық"],
  },
  {
    id: "ball",
    paths: [circle(24, 24, 16), "M24 17 L30 21 L28 28 L20 28 L18 21 Z", "M24 17 L24 8", "M30 21 L38 18", "M28 28 L33 36", "M20 28 L15 36", "M18 21 L10 18"],
    stems: ["football", "soccer", "match", "game", "sport", "gym", "training", "футбол", "матч", "игр", "спорт", "трениров", "зал ", "ойын", "жаттығу"],
  },
  {
    id: "bus",
    paths: ["M10 10 L38 10 C40 10 41 11 41 13 L41 34 L7 34 L7 13 C7 11 8 10 10 10 Z", "M10 15 L38 15 L38 23 L10 23 Z", "M24 15 L24 23", "M12 34 a3 3 0 1 0 6 0", "M30 34 a3 3 0 1 0 6 0"],
    stems: ["bus", "train", "metro", "car ", "drive", "trip", "travel", "автобус", "поезд", "метро", "машин", "ехал", "поездк", "путешеств", "пойыз", "көлік", "саяхат"],
  },
  {
    id: "clock",
    paths: [circle(24, 24, 16), "M24 13 L24 24 L31 28", "M24 9 L24 10.5", "M39 24 L37.5 24"],
    stems: ["late", "hurry", "early", "waited", "wait", "опозд", "спеш", "рано", "ждал", "кешік", "асық"],
  },
  {
    id: "smile",
    paths: [circle(24, 24, 17), "M17 20 L17 22", "M31 20 L31 22", "M15 28 C19 35 29 35 33 28"],
    stems: ["laugh", "fun ", "funny", "joke", "smile", "happy", "смея", "смеш", "весел", "весёл", "шутк", "улыб", "счаст", "күл", "қуаныш", "бақыт"],
  },
  {
    id: "plane",
    paths: ["M6 27 L20 25 L30 9 L34 9 L28 25 L40 24 C44 24 44 28 40 28 L28 27 L34 41 L30 41 L20 29 L6 29 Z"],
    stems: ["plane", "flight", "fly", "airport", "самол", "рейс", "летел", "аэропорт", "ұшақ"],
  },
];

/** The doodles a text calls for, in the order their words first appear (at most `max`). */
export function doodlesFor(text: string, max = 6): Doodle[] {
  const lower = ` ${text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ")} `;
  const found: { at: number; d: Doodle }[] = [];
  for (const d of DOODLES) {
    let best = -1;
    for (const stem of d.stems) {
      const i = lower.indexOf(` ${stem}`);
      if (i >= 0 && (best < 0 || i < best)) best = i;
    }
    if (best >= 0) found.push({ at: best, d });
  }
  return found.sort((a, b) => a.at - b.at).slice(0, max).map((f) => f.d);
}

/** A stable little tilt per doodle, so the same day always looks the same. */
export function tiltFor(id: string, i: number) {
  let h = i * 31;
  for (const c of id) h = (h * 33 + c.charCodeAt(0)) % 997;
  return (h % 17) - 8;
}
