import type { CourseArticle } from "../model";

/** Course section `intervals`, written in the /learn articles' style: half steps and whole steps, then the 5th and the octave as shapes, then by ear. */
export const intervals: CourseArticle = {
  updated: "2026-11-28T16:04",
  versions: { agents: 3, teaching: 16, voice: 7 },
  frets: 12,
  blocks: [
    { type: "p", text: "In [Do–Mi–Sol](/course/3/do-mi-sol) you sang from Do up to Mi and up to Sol. Each of those jumps has a size, and the size has a name: an interval is how far one note is from another." },
    { type: "p", text: "On the guitar an interval is a shape under your fingers. Learn a few of them and you stop counting frets: your hand knows where the next note is." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Play slowly and lightly, and let each note ring before the next.",
    ] },

    { type: "exercise", title: "1. Half steps and whole steps", lines: [
      "The smallest interval is a half step: one fret, or one note on the piano to the very next one. Two half steps make a whole step: two frets.",
      "Under this is the neck with the notes of the A major scale. The framed notes are {{1}}, {{2}}, {{3}} and {{4}}: Do, Re, Mi and Fa.",
      "Press Island 1 under the neck to hear them, then play them on your guitar.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "2", "3", "4"], count: 1 } }, after: [
      "{{1}} to {{2}} and {{2}} to {{3}} are whole steps: two frets each. {{3}} to {{4}} is a half step: listen for how close those two notes sound.",
      "Here {{4}} is the open D string. It's the same note as the faded {{4}} one fret above {{3}} on the A string.",
      "The major scale is whole steps all the way, except in two places: Mi to Fa, and Ti to the Do above.",
    ] },

    { type: "exercise", title: "2. The 5th and the octave", lines: [
      "Two bigger intervals are worth knowing by shape. The first is the 5th, Do to Sol.",
      "Press Island 1 under the first neck to hear {{1}} and {{5}}: the open A string, then one string up and two frets up.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "5"], count: 1 } }, between: [
      "The second is the octave: the same note, higher. Press Island 1 under the second neck to hear Do and the Do above: two strings up and two frets up.",
    ], beside: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "8"], count: 1 } }, after: [
      "Play each pair one note after the other, then both notes together.",
      "Practice until your fingers find the 5th and the octave without you counting frets.",
    ] },

    { type: "exercise", title: "3. Name it by ear", lines: [
      "Press Start below to hear two notes. Hear the first one as Do, and pick the name of the second: P4, P5 or P8.",
      "The game writes a 4th as P4, a 5th as P5 and an octave as P8, with the solfège under each answer.",
      "If two answers sound alike, press Replay below and sing both notes before you pick.",
    ], tool: { type: "interval-ears", set: [5, 7, 12], dir: "up" }, after: [
      "Practice until you can tell the 4th from the 5th without guessing.",
    ] },

    { type: "guide", slug: "intervals-and-solfege", text: "Want every interval and its name in one place? This guide has them all on a piano and on the guitar neck." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Start from the open low E string: the 5th and the octave are the same shapes, one string lower.",
      "Try both shapes from a note on the G string. The B string is tuned differently, so the upper note sits one fret further up.",
      "Sing Do, then Sol, then the Do above, and check each one against your guitar.",
    ] },
    { type: "p", text: "First you count frets. After a while the 5th and the octave are just where your fingers go, and you hear them coming in the songs you play." },
  ],
};
