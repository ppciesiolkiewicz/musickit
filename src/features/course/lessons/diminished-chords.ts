import type { CourseArticle } from "../model";

/** Course section `diminished-chords`, written in the /learn articles' style. */
export const diminishedChords: CourseArticle = {
  updated: "2026-11-28T02:30",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "In [Augmented chords](/course/7/augmented-chords) a major chord raised its 5th. A diminished chord does the opposite to a minor chord: it lowers the 5th by a half step." },
    { type: "p", text: "The Am chord is A, C and E. Adim is A, C and E♭. Each note sits a minor 3rd above the one under it, so the chord has no steady 5th to stand on. It's tense, and it wants to move. You met one in [Chords from the scale](/course/5/chords-from-scale): F♯dim, the chord on the 7th note of G major." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Press only as hard as each note needs, and shake your hand loose between tries.",
    ] },

    { type: "exercise", title: "1. Minor, then diminished", lines: [
      "Tap {{1}}, {{b3}} and {{5}} on the staff below: A minor, one note at a time.",
    ], tool: { type: "staff", scale: "natural-minor-aeolian", key: "a", voice: "tenor", notes: ["1", "b3", "5"], mic: false },
    between: [
      "Now tap {{1}}, {{b3}} and {{b5}} on this staff: A diminished. Only the top note moved, down a half step from E to the ringed E♭.",
      "Go between the two staffs until you can hum the lowered note before you tap it.",
    ],
    beside: { type: "staff", scale: "locrian", key: "a", voice: "tenor", notes: ["1", "b3", "b5"], highlight: ["b5"], mic: false } },

    { type: "exercise", title: "2. One fret down", lines: [
      "Press a chord box below to hear it, then play the Am chord and Adim on your guitar. On the D string the E drops one fret to E♭.",
      "Then press Intervals under the chord boxes. The 5 turns into ♭5.",
    ], tool: { type: "chord-shapes", chords: ["Am", "Adim"], frets: [null, "x 0 1 2 1 x | x 0 1 3 2 x"] }, after: [
      "Practice until you can tell them apart with your eyes closed: listen for the one note that drops.",
    ] },

    { type: "exercise", title: "3. D7 without its root", lines: [
      "F♯dim is F♯, A and C. D7 is D, F♯, A and C: the same three notes with D under them. So F♯dim is D7 with the open D string left out.",
      "Press each chord box below, then play D7, F♯dim and the G chord on your guitar.",
      "F♯dim goes home like D7 does: F♯ climbs to G, Ti to Do, and C drops to B, Fa to Mi.",
    ], tool: { type: "chord-shapes", chords: ["D7", "F♯dim", "G"], frets: [null, "x x x 2 1 2 | x x x 2 1 3", null] }, after: [
      "Practice until you hear F♯dim pull to the G chord the way D7 does, as in [Ti–Do](/course/7/ti-do).",
    ] },

    { type: "exercise", title: "4. Four triads on D", lines: [
      "Here are the four kinds of triad on one root: D, Dm, Ddim and Daug. Press Intervals under the chord boxes: the 3 or ♭3 says major or minor, and the 5 stays, drops to ♭5 or rises to ♯5.",
      "Press a chord box below to hear it. Go from the D chord to Daug and from Dm to Ddim, then press the four in any order.",
    ], tool: { type: "chord-shapes", chords: ["D", "Dm", "Ddim", "Daug"], frets: [null, null, "x x 0 1 3 1 | x x 0 1 3 2", "x x 0 3 3 2 | x x 0 2 3 1"] }, after: [
      "Then look away, press a box without choosing, and name the triad before you look. Listen to the 3rd first, then to the 5th.",
      "Practice until you can hear which way the 5th moved.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "End a G C D7 G loop with F♯dim in place of D7, and listen for the same pull home.",
      "Strum the Dm chord and Ddim back and forth: only the G string moves, one fret down.",
      "Make up a short loop of your own with one diminished or augmented chord in it, and end it on a plain chord.",
    ] },
    { type: "p", text: "Soon a diminished chord in a song stops sounding wrong and starts sounding like a door opening onto the next chord. Next, the chords [pop and rock](/course/7/chords-in-pop-rock) lean on." },
  ],
};
