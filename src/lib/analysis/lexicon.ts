export type Nudge = Partial<Record<"v" | "a" | "n" | "t" | "s" | "w", number>>;

export const AFFECT: Record<string, Nudge> = {
  happy: { v: 0.8, a: 0.4 }, joy: { v: 0.9, a: 0.6 }, glad: { v: 0.6 }, laugh: { v: 0.8, a: 0.6, s: 0.4 },
  smil: { v: 0.6, a: 0.2 }, fun: { v: 0.7, a: 0.6 }, excit: { v: 0.6, a: 0.9 }, thrill: { v: 0.6, a: 0.9 },
  amaz: { v: 0.8, a: 0.7 }, wonderful: { v: 0.8, a: 0.4 }, beautiful: { v: 0.7, a: 0.2, w: 0.2 },
  love: { v: 0.8, w: 0.6, s: 0.3 }, grateful: { v: 0.7, w: 0.5 }, free: { v: 0.6, a: 0.5 },
  celebrat: { v: 0.8, a: 0.8, s: 0.6 }, danc: { v: 0.7, a: 0.9, s: 0.4 }, sing: { v: 0.6, a: 0.6 },
  sunlight: { v: 0.5, a: 0.3, w: 0.5 }, sunny: { v: 0.6, a: 0.3, w: 0.5 }, bright: { v: 0.4, a: 0.3 },
  alive: { v: 0.7, a: 0.7 }, energ: { v: 0.4, a: 0.9 }, wild: { a: 0.8 }, swim: { v: 0.5, a: 0.6 },
  jump: { v: 0.4, a: 0.8 }, ran: { a: 0.7 }, run: { a: 0.7 },
  calm: { v: 0.4, a: -0.7 }, peace: { v: 0.6, a: -0.7 }, quiet: { a: -0.6 }, still: { a: -0.5 },
  slow: { a: -0.6 }, gentle: { v: 0.4, a: -0.5, w: 0.3 }, soft: { a: -0.4, w: 0.3 }, rest: { v: 0.3, a: -0.6 },
  relax: { v: 0.5, a: -0.6 }, lazy: { v: 0.2, a: -0.7 }, sleep: { a: -0.6 }, breath: { a: -0.3 },
  wander: { v: 0.3, a: -0.3 }, walk: { a: -0.2 }, stroll: { v: 0.3, a: -0.5 }, cozy: { v: 0.6, a: -0.5, w: 0.8 },
  cosy: { v: 0.6, a: -0.5, w: 0.8 }, comfort: { v: 0.5, a: -0.4, w: 0.7 }, content: { v: 0.5, a: -0.4 },
  warm: { v: 0.3, w: 0.9 }, hug: { v: 0.6, w: 0.9, s: 0.6 }, tea: { w: 0.6, a: -0.3 }, cocoa: { w: 0.8, v: 0.3 },
  coffee: { w: 0.4 }, blanket: { w: 0.8, a: -0.4 }, fire: { w: 0.7 }, candle: { w: 0.6, a: -0.4 },
  sun: { v: 0.3, w: 0.5 }, summer: { v: 0.4, a: 0.3, w: 0.5 }, golden: { v: 0.3, w: 0.6 }, glow: { v: 0.4, w: 0.5 },
  restless: { v: -0.2, a: 0.7, t: 0.5 }, racing: { a: 0.8, t: 0.2 }, sharp: { a: 0.5, t: 0.4 },
  cold: { w: -0.6 }, freez: { w: -0.8, t: 0.2 }, chill: { w: -0.4 }, icy: { w: -0.8 }, frost: { w: -0.5 },
  remember: { n: 0.75 }, memor: { n: 0.8 }, nostalg: { n: 1 }, childhood: { n: 0.9, w: 0.3 },
  used: { n: 0.4 }, old: { n: 0.5 }, again: { n: 0.15 }, years: { n: 0.5 }, ago: { n: 0.7 },
  miss: { n: 0.8, v: -0.3 }, letter: { n: 0.6 }, photograph: { n: 0.5 }, film: { n: 0.4 },
  grandm: { n: 0.8, w: 0.5, s: 0.4 }, grandf: { n: 0.8, w: 0.5, s: 0.4 }, once: { n: 0.4 },
  wistful: { n: 0.9, v: -0.1 }, bittersweet: { n: 0.9, v: 0 }, fading: { n: 0.6, a: -0.3 },
  sad: { v: -0.8, a: -0.3 }, cry: { v: -0.7, a: 0.3 }, tear: { v: -0.5 }, lonely: { v: -0.7, s: -0.8 },
  alone: { s: -0.7 }, tired: { v: -0.3, a: -0.4, t: 0.3 }, exhaust: { v: -0.4, a: -0.2, t: 0.5 },
  empty: { v: -0.6, a: -0.4 }, grey: { v: -0.3, a: -0.3 }, gray: { v: -0.3, a: -0.3 }, lost: { v: -0.5 },
  angry: { v: -0.7, a: 0.8, t: 0.7 }, upset: { v: -0.6, a: 0.5, t: 0.4 }, hurt: { v: -0.6, t: 0.3 },
  deadline: { t: 1, a: 0.6 }, stress: { v: -0.4, a: 0.6, t: 0.9 }, anxious: { v: -0.5, a: 0.6, t: 0.9 },
  nervous: { v: -0.3, a: 0.6, t: 0.8 }, pressure: { t: 0.9, a: 0.5 }, rush: { a: 0.8, t: 0.7 },
  hurr: { a: 0.7, t: 0.6 }, focus: { t: 0.6, a: 0.3 }, concentrat: { t: 0.7, a: 0.3 }, debug: { t: 0.7, a: 0.4 },
  bug: { t: 0.5 }, crash: { t: 0.7, a: 0.5 }, submit: { t: 0.6, a: 0.5 }, exam: { t: 0.8, a: 0.4 },
  late: { t: 0.4 }, caffeine: { a: 0.6, t: 0.4 }, energy: { a: 0.5 }, push: { a: 0.6, t: 0.5 },
  finally: { v: 0.5, t: -0.3 }, done: { v: 0.4, t: -0.4 }, shipped: { v: 0.6, t: -0.2, a: 0.4 },
  proud: { v: 0.7, a: 0.4 }, relief: { v: 0.6, t: -0.6 }, relieved: { v: 0.6, t: -0.6 },
  friend: { s: 0.9, v: 0.3 }, together: { s: 0.9, v: 0.3 }, we: { s: 0.4 }, our: { s: 0.3 }, us: { s: 0.4 },
  family: { s: 0.8, w: 0.4 }, mom: { s: 0.6, w: 0.4 }, mum: { s: 0.6, w: 0.4 }, dad: { s: 0.6, w: 0.4 },
  sister: { s: 0.6 }, brother: { s: 0.6 }, conversation: { s: 0.7, a: -0.1 }, talk: { s: 0.6 },
  team: { s: 0.6 }, everyone: { s: 0.7 }, party: { s: 0.9, a: 0.8, v: 0.6 }, crowd: { s: 0.6, a: 0.5 },
};

export const NEGATIONS = new Set(["not", "no", "never", "nothing", "without", "hardly", "didn't", "wasn't", "don't", "isn't", "couldn't", "won't"]);
export const INTENSIFIERS = new Set(["very", "so", "really", "incredibly", "extremely", "completely", "totally", "absolutely", "deeply"]);

export const TIME_WORDS: Record<string, string[]> = {
  dawn: ["dawn", "sunrise", "daybreak", "first light"],
  morning: ["morning", "breakfast", "woke", "wake up", "am "],
  afternoon: ["afternoon", "noon", "lunch", "midday"],
  "golden-hour": ["sunset", "golden hour", "golden light", "dusk", "low sun"],
  evening: ["evening", "dinner", "twilight", "after work"],
  night: ["night", "stars", "moon", "dark", "streetlight"],
  "late-night": ["midnight", "2am", "3am", "4am", "1am", "all-nighter", "until morning", "late night", "past midnight"],
};

export const SEASON_WORDS: Record<string, string[]> = {
  spring: ["spring", "blossom", "bloom", "april", "may", "march", "tulip"],
  summer: ["summer", "beach", "heat", "hot day", "june", "july", "august", "swim", "sunburn", "ice cream"],
  autumn: ["autumn", "fall", "leaves", "fallen leaves", "october", "november", "september", "pumpkin", "harvest", "chestnut"],
  winter: ["winter", "snow", "december", "january", "february", "frost", "christmas", "new year"],
};

export const WEATHER_WORDS: Record<string, string[]> = {
  rain: ["rain", "rainy", "raining", "drizzle", "umbrella", "puddle", "storm"],
  snow: ["snow", "snowy", "snowing", "snowfall", "blizzard"],
  sun: ["sun", "sunny", "sunlight", "sunshine", "sunset", "sunrise"],
  wind: ["wind", "windy", "breeze", "gust"],
  fog: ["fog", "foggy", "mist", "misty", "haze"],
  cold: ["cold", "chilly", "freezing", "frost"],
  heat: ["hot day", "heat", "warm air", "humid", "scorching"],
  clouds: ["cloud", "cloudy", "overcast", "grey sky", "gray sky"],
};

export const INDOOR = ["room", "desk", "home", "kitchen", "office", "café", "cafe", "studio", "apartment", "library", "bed", "screen", "indoors", "inside", "laptop", "class"];
export const OUTDOOR = ["park", "street", "beach", "sea", "lake", "forest", "mountain", "field", "garden", "sky", "outside", "outdoors", "river", "city", "road", "path", "trail", "shore"];

export type MotifKind = "nature" | "drink" | "tech" | "place" | "light" | "water" | "people" | "music" | "object" | "weather";

export const MOTIF_WEIGHT: Record<MotifKind, number> = {
  nature: 1.3, drink: 1.2, light: 1.2, water: 1.2, tech: 1.2, weather: 1.1, object: 0.9, music: 0.9, place: 0.85, people: 0.8,
};

export const MOTIFS: { words: string[]; label: string; kind: MotifKind }[] = [
  { words: ["leaf", "leaves", "foliage"], label: "Leaves", kind: "nature" },
  { words: ["tree", "trees", "oak", "maple", "birch"], label: "Trees", kind: "nature" },
  { words: ["park"], label: "Park", kind: "place" },
  { words: ["flower", "flowers", "blossom", "bloom", "petal"], label: "Flowers", kind: "nature" },
  { words: ["meadow", "field", "grass"], label: "Meadow", kind: "nature" },
  { words: ["forest", "woods"], label: "Forest", kind: "nature" },
  { words: ["mountain", "hill", "hills"], label: "Hills", kind: "nature" },
  { words: ["coffee", "espresso", "latte", "cappuccino"], label: "Coffee", kind: "drink" },
  { words: ["tea", "chai"], label: "Tea", kind: "drink" },
  { words: ["cocoa", "hot chocolate"], label: "Cocoa", kind: "drink" },
  { words: ["wine"], label: "Wine", kind: "drink" },
  { words: ["code", "coding", "programming", "commit", "repository", "terminal"], label: "Code", kind: "tech" },
  { words: ["laptop", "computer", "monitor", "screen", "keyboard"], label: "Screens", kind: "tech" },
  { words: ["deadline", "submission", "launch", "release"], label: "Deadline", kind: "tech" },
  { words: ["phone", "message", "messages", "text"], label: "Messages", kind: "tech" },
  { words: ["city", "streets", "street", "downtown"], label: "City", kind: "place" },
  { words: ["window", "windows"], label: "Window", kind: "object" },
  { words: ["train", "metro", "subway", "tram", "bus"], label: "Train", kind: "place" },
  { words: ["road", "car", "drive", "highway"], label: "Road", kind: "place" },
  { words: ["home", "house", "apartment", "kitchen"], label: "Home", kind: "place" },
  { words: ["café", "cafe", "coffee shop"], label: "Café", kind: "place" },
  { words: ["sea", "ocean", "waves", "wave"], label: "Sea", kind: "water" },
  { words: ["beach", "shore", "sand"], label: "Shore", kind: "water" },
  { words: ["lake", "river", "pond"], label: "Water", kind: "water" },
  { words: ["swim", "swam", "swimming", "dive", "dived"], label: "Swimming", kind: "water" },
  { words: ["rain", "rainy", "raining", "drizzle", "puddle", "umbrella"], label: "Rain", kind: "weather" },
  { words: ["snow", "snowy", "snowflake"], label: "Snow", kind: "weather" },
  { words: ["wind", "breeze"], label: "Wind", kind: "weather" },
  { words: ["sun", "sunlight", "sunshine"], label: "Sunlight", kind: "light" },
  { words: ["sunset", "dusk", "golden hour"], label: "Sunset", kind: "light" },
  { words: ["sunrise", "dawn"], label: "Dawn", kind: "light" },
  { words: ["moon", "moonlight"], label: "Moon", kind: "light" },
  { words: ["stars", "star"], label: "Stars", kind: "light" },
  { words: ["lamp", "lamplight", "neon", "lights", "streetlight"], label: "Lamplight", kind: "light" },
  { words: ["candle", "candles"], label: "Candles", kind: "light" },
  { words: ["friend", "friends"], label: "Friends", kind: "people" },
  { words: ["family", "mom", "mum", "dad", "sister", "brother", "grandma", "grandmother"], label: "Family", kind: "people" },
  { words: ["conversation", "conversations", "talked", "talking", "talk"], label: "Conversation", kind: "people" },
  { words: ["laughter", "laughed", "laughing", "laugh"], label: "Laughter", kind: "people" },
  { words: ["music", "song", "songs", "playlist", "headphones"], label: "Music", kind: "music" },
  { words: ["guitar", "piano", "concert", "dance", "dancing", "danced"], label: "Dancing", kind: "music" },
  { words: ["book", "books", "reading", "notebook"], label: "Pages", kind: "object" },
  { words: ["scarf", "sweater", "mittens", "coat", "gloves"], label: "Wool", kind: "object" },
  { words: ["bicycle", "bike", "cycling"], label: "Bicycles", kind: "object" },
  { words: ["picnic", "ice cream", "watermelon"], label: "Picnic", kind: "object" },
  { words: ["photo", "photos", "camera", "film"], label: "Photographs", kind: "object" },
];

export const SHARED_VERBS = [
  "remembered", "laughed", "walked", "talked", "danced", "swam", "ran", "sang", "stayed", "wandered",
  "drove", "cooked", "celebrated", "finished", "shipped", "built", "met", "dived", "watched", "climbed",
];
