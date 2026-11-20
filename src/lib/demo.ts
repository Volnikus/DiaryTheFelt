export interface DemoDay {
  id: string;
  day: string;
  text: string;
  photos: { src: string; author: string; source: string }[];
  song: { src: string; name: string };
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

export const DEMO_DAYS: DemoDay[] = [
  {
    id: "demo-autumn",
    day: "2026-10-24",
    text:
      "Walked through the old park with Dana after lunch — the first properly cold day of October. It was cold enough for mittens, and the leaves were everywhere — on the paths, on the benches, falling slowly whenever the wind moved. We bought hot tea from the kiosk by the gate and held the cups more than we drank them. We talked about the summer we were twelve and the house by the river, and how strange it is that it already feels like an old photograph. The light stayed low and soft all afternoon. Nothing happened, really. We just walked, and talked, and remembered. On the way home the streetlights came on one by one and I didn't want the day to end.",
    photos: [
      { src: "/demo/autumn/park-lane.jpg", author: "Davide Ragusa", source: commons("Autumn park lane (Unsplash).jpg") },
      { src: "/demo/autumn/falling-leaves.jpg", author: "Autumn Mott", source: commons("Swirling autumn leaves (Unsplash).jpg") },
      { src: "/demo/autumn/warm-cup.jpg", author: "PICSELI", source: commons("Hot coffee on a cold day (Unsplash).jpg") },
      { src: "/demo/autumn/tea-talk.jpg", author: "Matthew Henry", source: commons("Friends talking over tea (Unsplash).jpg") },
    ],
    song: { src: "/demo/autumn/song.wav", name: "Kiosk by the Gate — original demo track" },
  },
  {
    id: "demo-deadline",
    day: "2026-11-07",
    text:
      "Deadline at 9am. Started at eight in the evening with a cold coffee and a list of seventeen bugs. The office across the street went dark floor by floor until only the screens were left glowing in the window. Headphones on, the same techno playlist on repeat, keeping my hands moving. Fixed the upload crash at 1am. Broke the build at 2am. Fixed it again at 3am. Everything narrowed to the terminal and the cursor. Around 4am I stopped feeling tired and started feeling sharp, like the code was finally answering back. Pushed the last commit at 6:40 as the sky turned grey-blue. Submitted. Then I just sat there, listening to the laptop fan slow down.",
    photos: [
      { src: "/demo/deadline/code.jpg", author: "Markus Spiske", source: commons("Code on computer monitor (Unsplash).jpg") },
      { src: "/demo/deadline/workstation.jpg", author: "Farzad Nazifi", source: commons("Coding workstation (Unsplash).jpg") },
      { src: "/demo/deadline/offices.jpg", author: "Mike Kononov", source: commons("Illuminated offices in Moscow (Unsplash).jpg") },
    ],
    song: { src: "/demo/deadline/song.wav", name: "Seventeen Bugs — original demo track" },
  },
  {
    id: "demo-summer",
    day: "2026-07-19",
    text:
      "Summer, finally! Six of us crammed into Aru's car with the windows down and the playlist way too loud, singing badly all the way to the coast. The sea was freezing for the first second and perfect after that. We swam out past the waves and dived again and again, racing each other back to the shore. Someone brought watermelon, someone forgot towels, nobody cared. We lay in the sun until our skin smelled like salt. At golden hour we walked through the meadow behind the beach with our friends, laughing at nothing, everything glowing. I want to remember exactly how loud and bright and easy it felt!",
    photos: [
      { src: "/demo/summer/shoreline.jpg", author: "Richard Nolan", source: commons("Friends on a quiet beach (Unsplash).jpg") },
      { src: "/demo/summer/dive.jpg", author: "Todd Quackenbush", source: commons("Summer Fun (Unsplash).jpg") },
      { src: "/demo/summer/beach.jpg", author: "Will Langenberg", source: commons("People enjoying summer beach (Unsplash).jpg") },
      { src: "/demo/summer/meadow.jpg", author: "James Pritchett", source: commons("Glowing meadow in summer (Unsplash).jpg") },
    ],
    song: { src: "/demo/summer/song.wav", name: "Windows Down — original demo track" },
  },
];
