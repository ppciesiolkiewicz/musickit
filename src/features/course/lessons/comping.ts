import type { CourseArticle } from "../model";

/** one bar of the Charleston rhythm on a three-note shell: a long chord on beat 1, a short one after beat 2, then rests (strings: 1 is the high e) */
const charleston = (low: { string: number; fret: number }, mid: { string: number; fret: number }, top: { string: number; fret: number }) => [
  { frets: [{ ...low, beats: 1.5 }, { ...mid, beats: 1.5 }, { ...top, beats: 1.5 }], beats: 1.5 },
  { frets: [{ ...low, beats: 0.5 }, { ...mid, beats: 0.5 }, { ...top, beats: 0.5 }], beats: 0.5 },
  { rest: 2 },
];
const dm7 = charleston({ string: 5, fret: 5 }, { string: 3, fret: 5 }, { string: 2, fret: 6 });
const g7 = charleston({ string: 6, fret: 3 }, { string: 4, fret: 3 }, { string: 3, fret: 4 });
const cmaj7 = charleston({ string: 5, fret: 3 }, { string: 3, fret: 4 }, { string: 2, fret: 5 });

/** Course section `comping`, written in the /learn articles' style. */
export const comping: CourseArticle = {
  updated: "2026-11-28T02:28",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "Comping is playing the chords behind someone else's tune. They have the melody, and you play the chords under it with the shells from the [Jazz standards](/course/11/jazz-standards) section." },
    { type: "p", text: "Good comping is mostly space. Short chords in a set rhythm tell the singer where the beat and the chord are, and the gaps between them leave room for the tune." },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "exercise", title: "1. Short chords on 2 and 4", lines: [
      "Here's the ii–V–I in C as shells. Dm7 and Cmaj7 have their root on the A string, G7 on the low E string. Press a chord box below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["Dm7", "G7", "Cmaj7"], frets: ["x 5 x 5 6 x", "3 x 3 4 x x", "x 3 x 4 5 x"] }, between: [
      "Press the Play button below to start the metronome. After a bar of count-in, the lit box shows the chord to play. Strum each shell on beats 2 and 4 only.",
      "Lift your fretting fingers a little right after each strum, so the chord stops short.",
    ], beside: { type: "strum-along", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7"], bpm: 60, pattern: ". D . D" }, after: [
      "Practice until the next shell is under your fingers before its beat 2 comes.",
    ] },

    { type: "exercise", title: "2. Root, then 3rd and 7th", lines: [
      "Now split each shell in two. Pick the root, the lowest note, alone on beats 1 and 3. Strum the 3rd and 7th together on beats 2 and 4.",
      "Press the Play button below to start the metronome. The lit strum shows where you are in the bar.",
    ], tool: { type: "strum-along", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7"], bpm: 60, pattern: "D D D D" }, after: [
      "That's a bass line and a chord from one hand. Practice until it is in your muscle memory: your picking hand finds the string of each root without you looking.",
    ] },

    { type: "exercise", title: "3. The Charleston rhythm", lines: [
      "Here's a rhythm jazz players come back to again and again, the Charleston: a long chord on beat 1, a short one just after beat 2, then silence.",
      "Press the Play button below to hear it with the metronome, and follow the tab. The shells are the ones from exercise 1. Lift your fretting fingers a little to stop the short chord.",
      "If a change comes late, play only the chord on beat 1 of each bar, then add the short one.",
    ], tool: { type: "guitar-play-along", shape: { shape: "riff", key: "c", scale: "Ionian", notes: [...dm7, ...g7, ...cmaj7, ...cmaj7] }, bpm: 60, view: "tab" }, after: [
      "Practice until the silence in each bar feels as steady as the chords.",
    ] },

    { type: "exercise", title: "4. Comp with a band", lines: [
      "Press the Play button below to start the backing track: drums and bass, and the chord boxes light as the bars go by. You're the only one playing the chords.",
      "Comp in any of the three rhythms above. Then mix them: the Charleston for a few bars, then 2 and 4.",
    ], tool: { type: "backing-track", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7"], key: "c", style: "swing", bpm: 80, parts: { drums: "always", bass: "on" } }, after: [
      "Listen for the gaps: when your chords stay short, the drums and bass carry the beat and you add the colour on top.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Swap in the 9th chords from [9ths & 13ths](/course/11/extended): comp Am9, D9 and Gmaj7 in the Charleston rhythm.",
      "Comp the changes of Autumn Leaves from [Jazz standards](/course/11/jazz-standards), and play only on beats 2 and 4.",
      "Leave a whole bar out now and then. Hear how the next chord sounds stronger after the gap.",
    ] },
    { type: "p", text: "Before long you'll stop thinking about the chords and start listening to the singer, and that's when comping starts to swing." },
  ],
};
