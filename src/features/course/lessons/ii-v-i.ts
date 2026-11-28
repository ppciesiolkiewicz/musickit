import type { CourseArticle } from "../model";

/** Course section `ii-v-i`, written in the /learn articles' style. */
export const iiVI: CourseArticle = {
  updated: "2026-11-28T02:28",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "In [Shell voicings](/course/11/shells) you played Dm7, G7 and Cmaj7 in a row. Those three chords in that order are the ii–V–I, and jazz is full of them: most standards are built from one ii–V–I after another." },
    { type: "p", text: "Once you can hear one coming, a page of jazz chords turns into a few short moves home. Here's the move in a major key, then in a minor one." },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "exercise", title: "1. Three chords from C major", lines: [
      "Build a 7th chord on three notes of the C major scale, the way you did in [Chords from the scale](/course/5/chords-from-scale) with one more note on top. Dm7 is the 2nd chord of the key, built on {{2}}. G7 is the 5th chord, built on {{5}}. Cmaj7 is the 1st chord, built on {{1}}.",
      "Press Play below to start the backing track: Dm7, G7, then two bars of Cmaj7. Say each chord's number as it arrives: 2, 5, then 1.",
      "Listen for the pull in the G7 bar: it leans hard towards Cmaj7, and Cmaj7 sounds like home.",
    ], tool: { type: "backing-track", progression: "ii-v-i", key: "c", style: "swing", bpm: 80 }, after: [
      "Each root is a 5th above the next: D down to G, G down to C. That's why the move sounds so sure of where it's going.",
    ] },

    { type: "exercise", title: "2. The ii–V–I with shells", lines: [
      "Here are the three chords as shells, with the root on the A string, then the low E string, then the A string again. Press a chord box below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["Dm7", "G7", "Cmaj7"], frets: ["x 5 x 5 6 x", "3 x 3 4 x x", "x 3 x 4 5 x"] }, between: [
      "Press Play below to start the metronome. Strum each shell four times, one bar each, and Cmaj7 for two bars.",
      "If a change comes late, keep your strumming hand going and catch the next beat 1.",
    ], beside: { type: "strum-along", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7"], bpm: 60, pattern: "D D D D" }, after: [
      "Practice until your hand moves to the next shell without you looking at the neck.",
    ] },

    { type: "exercise", title: "3. The ii–V–i in A minor", lines: [
      "A minor key has its own ii–V–i: Bm7♭5, E7 and Am7. In [Harmonic minor](/course/9/harmonic-minor) B7 pulled back to Em; here E7 pulls back to Am the same way.",
      "Press Play below to start the backing track. Listen for the two chords that changed colour: the 2nd chord is half-diminished now, a minor 7 chord with a ♭5, and the home chord is minor. The 5th chord is still a dominant 7.",
    ], tool: { type: "backing-track", progression: "minor-ii-v", key: "a", style: "swing", bpm: 80 }, between: [
      "Now play it with the chord boxes below, all three close to the nut. Strum each one four times with the backing track.",
    ], beside: { type: "chord-shapes", chords: ["Bm7♭5", "E7", "Am7"], frets: ["x 2 3 2 3 x", "0 x 0 1 x x", "x 0 x 0 1 x"] }, after: [
      "Practice until you can hear the home chord coming two bars early, from the Bm7♭5 alone.",
    ] },

    { type: "exercise", title: "4. Two homes in one tune", lines: [
      "Tunes often mix both: a ii–V–I to C major, then a ii–V–i to A minor, its relative minor.",
      "Press Play below to start the metronome and strum along with the shells from exercises 2 and 3. Call out \"major\" or \"minor\" as each home chord arrives.",
      "Listen for the 2nd chord: Dm7 comes before the major home, Bm7♭5 before the minor one.",
    ], tool: { type: "strum-along", chords: ["Dm7", "G7", "Cmaj7", "Cmaj7", "Bm7♭5", "E7", "Am7", "Am7"], bpm: 60, pattern: "D D D D" }, after: [
      "Practice until the eight bars go round without a stop between the two halves.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Move the major ii–V–I to D major: Em7, A7 and Dmaj7. The shells are the same shapes, two frets higher.",
      "Play the backing track of exercise 1 and strum only on beats 2 and 4.",
      "Pick a song from [Jazz standards](/course/11/jazz-standards) and find every ii–V–I in its chords.",
    ] },
    { type: "p", text: "Soon a jazz chart will stop looking like a list of chords and start looking like a few trips home." },
  ],
};
