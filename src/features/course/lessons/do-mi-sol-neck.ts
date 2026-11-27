import type { CourseArticle } from "../model";

/** Course section `do-mi-sol-neck`, written in the /learn articles' style. */
export const doMiSolNeck: CourseArticle = {
  updated: "2026-11-27T20:57",
  labels: "solfege",
  blocks: [
    { type: "p", text: "In [Do–Mi–Sol](/course/3/do-mi-sol) you sang the three notes of the major chord. Now play them one at a time on the guitar, low on the neck." },
    { type: "p", text: "It's the same three notes your G and C chords hold, just picked one by one. Once your fingers know where they are, you'll find them under every melody and solo that uses that chord." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Pick one string at a time, slowly. Let each note ring before the next.",
    ] },

    { type: "exercise", title: "1. G, B and D low on the neck", lines: [
      "In G major, Do is G, Mi is B and Sol is D. Every dot on this neck is one of the three, and the ringed dots are G, your Do.",
      "Start on the ringed G on the low E string, 3rd fret. Play every dot string by string up to the G on the high e string, 3rd fret, then come back down the same way.",
      "Sing along on the note names: Do, Mi or Sol for each note as you play it.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "g", placement: { by: "open" }, enable: ["1", "3", "5"], others: "hidden", highlight: ["1"] }, after: [
      "Practice until you can play up and down without looking for the next note.",
    ] },

    { type: "exercise", title: "2. A tune from three notes", lines: [
      "On the neck above, three of them sit side by side on the D, G and B strings. Play the D string at the 5th fret, the G string at the 4th fret, then the B string at the 3rd fret: Do, Mi, Sol.",
      "Then play it back down, Sol, Mi, Do, and make up a little tune from the three.",
    ] },

    { type: "exercise", title: "3. Now in C: C, E and G", lines: [
      "In C major, Do is C, Mi is E and Sol is G. The ringed dots are C.",
      "Start on the ringed C on the A string, 3rd fret. Play every dot string by string up to the G on the high e string, 3rd fret, then back down.",
      "The smallest tune here is the B string at the 1st fret, then the open high e, then the high e at the 3rd fret: Do, Mi, Sol.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "c", placement: { by: "open" }, enable: ["1", "3", "5"], others: "hidden", highlight: ["1"] }, after: [
      "When you change from G to C, every note is new, but Do still sounds like home.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Hold the G chord and pick it one string at a time, saying Do, Mi or Sol for each note.",
      "Sing Do, Mi, Sol first, then find it on the neck from any G.",
      "Play the tune from exercise 2 starting on Sol: Sol, Mi, Do, Mi, Sol.",
    ] },
    { type: "p", text: "First the notes near Do get easy to find. Then the ones further away come too." },
  ],
};
