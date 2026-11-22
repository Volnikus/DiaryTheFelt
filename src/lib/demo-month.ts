/*
 * A whole demonstration month: October 2026, one page a day (the 24th is the
 * "October Afternoon with Dana" showcase day). Fictional, written so the weekly and
 * monthly recaps have something real to look back on: school, friends, a sister,
 * a cat called Biscuit, guitar, a weekend by the sea, a cold, an election, Halloween.
 * Photographs and songs are reused from the three showcase days.
 */

export interface MonthDay {
  day: string;
  text: string;
  photos: string[];
  song: "autumn" | "deadline" | "summer";
}

const A = (f: string) => `/demo/autumn/${f}.jpg`;
const D = (f: string) => `/demo/deadline/${f}.jpg`;
const S = (f: string) => `/demo/summer/${f}.jpg`;

export const MONTH_SONGS = {
  autumn: { src: "/demo/autumn/song.wav", name: "Kiosk by the Gate — original demo track" },
  deadline: { src: "/demo/deadline/song.wav", name: "Seventeen Bugs — original demo track" },
  summer: { src: "/demo/summer/song.wav", name: "Windows Down — original demo track" },
} as const;

export const MONTH_DAYS: MonthDay[] = [
  {
    day: "2026-10-01",
    text: "First day of October and I started a new notebook. It rained all morning, soft and steady. Made tea, sat by the window with Biscuit on my lap and watched the drops race down the glass. Nothing big happened, and that felt nice. I want to write one page every day this month, even the boring ones.",
    photos: [A("warm-cup")],
    song: "autumn",
  },
  {
    day: "2026-10-02",
    text: "The math test was awful. I knew the formulas yesterday and today my head was just empty. I was so annoyed with myself on the bus home. Then Biscuit tried to jump onto the bookshelf, missed, and pretended it was on purpose. I laughed so much I forgot to be upset for a while.",
    photos: [D("workstation")],
    song: "deadline",
  },
  {
    day: "2026-10-03",
    text: "Football match against the school across the river and we won 3–1! I scored the second goal with my left foot, which never happens. The field was all mud and my socks will never be white again. Coach said he was proud of us. The whole team sang on the bus home. Best Saturday in ages.",
    photos: [S("meadow")],
    song: "summer",
  },
  {
    day: "2026-10-04",
    text: "Lazy Sunday. Mia and I made pancakes and most of the batter ended up on the counter. Slept again after breakfast. In the evening the whole family had dinner together and Dad told the story about his first car for the hundredth time. Warm, slow and quiet. I liked it.",
    photos: [A("tea-talk")],
    song: "autumn",
  },
  {
    day: "2026-10-05",
    text: "Rainy Monday. The bus was late, my umbrella turned inside out and my socks got wet in the first five minutes. Grumpy all morning. History was good though — we learned about old maps and how people drew sea monsters where they didn't know what was there. I kind of love that.",
    photos: [D("offices")],
    song: "autumn",
  },
  {
    day: "2026-10-06",
    text: "Guitar lesson today and I finally played the whole song without stopping! My fingers hurt but I didn't care. My teacher smiled and said I'm ready for something harder. Walked home through the leaves humming it the whole way.",
    photos: [A("falling-leaves")],
    song: "summer",
  },
  {
    day: "2026-10-07",
    text: "So much homework. Physics, an essay and a project plan, all for tomorrow. Stayed up late at my desk and everything felt heavy and slow. Tired and a bit sad for no clear reason. Going to sleep and hoping tomorrow is lighter.",
    photos: [D("workstation")],
    song: "deadline",
  },
  {
    day: "2026-10-08",
    text: "After school Dana and I walked through the park. The trees are turning orange and yellow now, and the air smells like cold apples. We talked about winter plans — skating, the market, maybe snow this year. Calm, happy, the good kind of tired.",
    photos: [A("park-lane")],
    song: "autumn",
  },
  {
    day: "2026-10-09",
    text: "Science project day. Leo and I built a volcano model and it exploded way too early, right in the middle of our presentation. Foam everywhere. The whole class laughed, the teacher laughed, we laughed. We still got a good mark for being honest about what went wrong. Funniest day of the month so far.",
    photos: [A("tea-talk")],
    song: "summer",
  },
  {
    day: "2026-10-10",
    text: "Family trip to the coast! The beach was cold and windy, nobody else there. Mia and I collected shells and ran away from the waves. Mum brought hot chocolate in a flask. The sea was grey and huge and so beautiful. I want to remember the sound of it.",
    photos: [S("shoreline"), S("beach")],
    song: "summer",
  },
  {
    day: "2026-10-11",
    text: "Woke up early and went down to the sea before breakfast. The sun came out over the water, all gold. I put my feet in — freezing! — and screamed, and Mia laughed at me. Drove home singing every song on the radio. Happy, happy, happy.",
    photos: [S("beach"), S("dive")],
    song: "summer",
  },
  {
    day: "2026-10-12",
    text: "Back to school. I missed the sea all day. Quiet, ordinary Monday. Lunch alone in the library with a book, which was actually nice. A bit low in the evening, like the weekend ended too fast.",
    photos: [D("offices")],
    song: "autumn",
  },
  {
    day: "2026-10-13",
    text: "Had a fight with Dana. It started over something stupid, who forgot to bring the notes, and then we both said mean things. I walked home alone, angry and lonely at the same time. Couldn't eat dinner. Everything felt wrong and loud in my head.",
    photos: [A("falling-leaves")],
    song: "deadline",
  },
  {
    day: "2026-10-14",
    text: "I said sorry to Dana before first lesson. She said sorry too, at the exact same moment, and then we couldn't stop laughing. Such a relief. We shared her chocolate at lunch like nothing happened. Friends are strange and wonderful.",
    photos: [A("tea-talk")],
    song: "summer",
  },
  {
    day: "2026-10-15",
    text: "Rain all day again. In English we wrote an essay about a memory and I wrote about the beach on Sunday. Came home, made tea, read my book under a blanket with Biscuit purring. Calm and cosy.",
    photos: [A("warm-cup")],
    song: "autumn",
  },
  {
    day: "2026-10-16",
    text: "Got sick. Sore throat, headache, the whole thing. Stayed in bed all day. Biscuit slept on my feet like a warm little stone. Mum brought soup and honey. Felt tired and sorry for myself, but also kind of looked after.",
    photos: [A("warm-cup")],
    song: "autumn",
  },
  {
    day: "2026-10-17",
    text: "Still sick. Watched three films in a row and remember none of them. Bored, bored, bored. Mia drew me a get-well card with a cat in a hospital bed. It made my day a little better.",
    photos: [D("offices")],
    song: "autumn",
  },
  {
    day: "2026-10-18",
    text: "Feeling better! Went for a short walk with Dad. The sun came out and the leaves in the park were completely golden. Breathing cold air after two days inside felt amazing. Small things, bright day.",
    photos: [A("park-lane")],
    song: "summer",
  },
  {
    day: "2026-10-19",
    text: "Biology test and it actually went well! I studied with Leo on the phone yesterday evening and it helped so much. Proud of myself. Celebrated with a huge sandwich at lunch.",
    photos: [D("workstation")],
    song: "summer",
  },
  {
    day: "2026-10-20",
    text: "Wrote my own little melody on the guitar today. Just eight bars, but it's mine. Recorded it on my phone and listened to it about twenty times. Mia says it sounds like rain. I think that's the best thing anyone has said about my music.",
    photos: [A("falling-leaves")],
    song: "summer",
  },
  {
    day: "2026-10-21",
    text: "School election speeches. I was so nervous my hands were shaking and my voice went weird at the start. But I did it, the whole speech, and some people clapped really loud. Mixed feelings, scared and proud at the same time.",
    photos: [D("offices")],
    song: "deadline",
  },
  {
    day: "2026-10-22",
    text: "Lost the election by four votes. Disappointed, honestly. I wanted it more than I said. But Dana and Leo hugged me at the gate and Leo said four votes is basically a draw. Sad but not alone.",
    photos: [A("tea-talk")],
    song: "autumn",
  },
  {
    day: "2026-10-23",
    text: "Movie night at Leo's with Dana. Pizza, blankets, a horror film that was way scarier than we expected. I screamed, Dana screamed, Leo pretended he didn't. We laughed until midnight. Perfect Friday.",
    photos: [A("warm-cup")],
    song: "summer",
  },
  {
    day: "2026-10-25",
    text: "Mia's birthday! She turned ten. Balloons everywhere, a chocolate cake shaped like a cat, all her friends dancing in the living room. I played her a song on the guitar and she hugged me. Loud, messy and so happy.",
    photos: [A("tea-talk"), A("falling-leaves")],
    song: "summer",
  },
  {
    day: "2026-10-26",
    text: "Horrible Monday. Forgot my homework, the teacher was annoyed, then I spilled water on my notes. Stressed and angry all day, like a storm in my chest. Came home and played guitar really loud until it went quiet inside.",
    photos: [D("offices")],
    song: "deadline",
  },
  {
    day: "2026-10-27",
    text: "First frost! The windows had little ice ferns this morning. I rode my bike to school and my fingers froze, but the sky was so clear and blue. Everything looked sharp and new. Calm and beautiful.",
    photos: [A("park-lane")],
    song: "autumn",
  },
  {
    day: "2026-10-28",
    text: "Coding club: Leo and I made a tiny game where a cat jumps over falling leaves. It had a bug where the cat could fly forever, which was honestly better than the real game. Fun, silly, we didn't want to leave.",
    photos: [D("code"), D("workstation")],
    song: "deadline",
  },
  {
    day: "2026-10-29",
    text: "History project due tomorrow and we were nowhere near done. Late night at the laptop, too much tea, slides, slides, slides. Tired and a bit panicked, but it's coming together. Deadline brain.",
    photos: [D("code")],
    song: "deadline",
  },
  {
    day: "2026-10-30",
    text: "Presented the history project and got an A! The teacher said our map was the best she's seen. Dana and I celebrated with hot chocolate at the café by the school. Proud and light, like the whole week was worth it.",
    photos: [A("tea-talk")],
    song: "summer",
  },
  {
    day: "2026-10-31",
    text: "Halloween. Mia was a cat, of course, and I was a ghost made from an old sheet. We carved a pumpkin, walked around the neighbourhood in the dark, and came home with too many sweets. The moon was almost full and the stars were out. Goodbye, October. You were a good one.",
    photos: [A("falling-leaves"), A("park-lane")],
    song: "summer",
  },
];
