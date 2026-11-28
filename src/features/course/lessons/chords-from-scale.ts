import type { CourseArticle } from "../model";

/** Course section `chords-from-scale`, written in the /learn articles' style. */
export const chordsFromScale: CourseArticle = {
  updated: "2026-11-27T20:57",
  versions: { agents: 2, teaching: 13, voice: 5 },
  blocks: [
    { type: "p", text: "The chords of a key aren't a list to learn by heart. They come out of the scale: take any note, skip one, take the next, skip one, take the next. Three notes, one chord." },
    { type: "p", text: "Do that from each of the seven notes of G major and you get all seven chords of the key, the same ones you've been playing in position 1. Once you see how, you can work out the chords of any key." },

    { type: "exercise", title: "1. Every other note", lines: [
      "The piano below shows G major: G, A, B, C, D, E and F♯. Tap {{1}}, {{3}} and {{5}}, one after the other: G, B and D. That's the G chord, Do–Mi–Sol.",
      "Now start one note higher. Tap {{2}}, {{4}} and {{6}}: A, C and E, the Am chord.",
      "Then start on {{4}}: C, E and G, the C chord, Fa–La–Do. Then on {{5}}: D, F♯ and A, the D chord, Sol–Ti–Re.",
    ], tool: { type: "piano-keys", key: "g", scale: "major-ionian" }, after: [
      "Each chord skips the same way: one note in, one note out. Practice until you can name the three notes of a chord from any note of the scale.",
    ] },

    { type: "exercise", title: "2. Seven notes, seven chords", lines: [
      "Here are all seven chords of G major, in the order of the scale: one built on each note, from G up to F♯. Press a chord box below to hear it.",
      "Three come out major (G, C and D), three minor (Am, Bm and Em), and one, F♯dim, is diminished: a tense chord that's rare in songs.",
    ], tool: { type: "chord-shapes", chords: ["G", "Am", "Bm", "C", "D", "Em", "F♯dim"] }, after: [
      "E minor has the same seven notes, so it has the same seven chords. Only home moves: the Em chord becomes the 1st chord.",
    ] },

    { type: "exercise", title: "3. Up the scale in chords", lines: [
      "Now play the chords of the key in order, up the scale and back down, with the open shapes you know: G, Am, C, D, Em, then D, C and Am. Bm needs a barre and F♯dim is rare, so leave them out for now.",
      "Press Play below to start the metronome, and strum down four times on each chord.",
      "If a change comes late, keep your strumming hand going and catch the next beat 1.",
    ], tool: { type: "strum-along", chords: ["G", "Am", "C", "D", "Em", "D", "C", "Am"], bpm: 60, pattern: "D D D D" }, after: [
      "Practice until you can play the whole loop without looking at the screen.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing the three notes of each chord on the note names as you strum it: Do Mi Sol for the G chord, Re Fa La for the Am chord.",
      "Pick a song from [First songs](/course/2/first-songs) and find each of its chords in the row of G major.",
      "Try it in C major: C, D, E, F, G, A and B. Stack every other note from C, and check your chords on the [chords of a key](/theory/caged) page.",
    ] },
    { type: "p", text: "Next, [three of these chords](/course/5/one-four-five) do most of the work in songs." },
  ],
};
