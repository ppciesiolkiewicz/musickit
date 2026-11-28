import type { CourseArticle } from "../model";

/** Course section `string-skipping`, written in the /learn articles' style. */
export const stringSkipping: CourseArticle = {
  updated: "2026-11-28T02:30",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "In [Greensleeves](/course/8/greensleeves) the pick mostly moved to the string next door. Wide tunes and arpeggios jump further: from the low E string to the D string, with the A string left quiet in between." },
    { type: "p", text: "That jump is twice as far for the pick, and it has to land on the right string. These drills build it up from the start, on open strings, so all your attention is on the picking hand." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Keep the strokes small: the pick only needs to pass the string.",
    ] },
    { type: "care", text: "_Rest your hand when your wrist starts to ache._" },

    { type: "exercise", title: "1. Down, then down and up", lines: [
      "Press Play below to start the metronome. Pick each open string four times with downstrokes, across all six strings and back, as the tab shows.",
    ], tool: { type: "picking-drill", level: "new", bpm: 60 }, parts: [
      { title: "Down and up", lines: [
        "Press Play below to start the metronome. Now pick down, up, down, up on each string. The arrows under the tab show each stroke.",
        "Practice until the upstroke is as loud as the downstroke.",
      ], tool: { type: "picking-drill", level: "beginner", bpm: 60 } },
    ] },

    { type: "exercise", title: "2. Three notes a string", lines: [
      "Press Play below to start the metronome. Each string now gets three notes, down, up, down, so the next string starts on an upstroke.",
      "If you lose the order of the strokes, say \"down, up\" out loud as you play.",
    ], tool: { type: "picking-drill", level: "intermediate", bpm: 60 }, after: [
      "Practice until starting a string on an upstroke feels as easy as starting on a downstroke.",
    ] },

    { type: "exercise", title: "3. Skip a string", lines: [
      "Press Play below to start the metronome. Pick down, up on the low E string, then jump over the A string to the D string, and over the G string to the B string, as the tab shows. Then come back down the same way.",
      "Let your wrist do the jump. If you hit the string in between, play just that one jump a few times, slowly, then go back to the drill.",
    ], tool: { type: "picking-drill", level: "advanced", bpm: 50 }, after: [
      "Practice until the pick lands on the right string without you looking.",
    ] },

    { type: "exercise", title: "4. Skip from the A string", lines: [
      "Press Play below to start the metronome. Now the jumps start on the A string: down, up on the A string, the G string and the high e string, then back.",
    ], tool: { type: "picking-drill", level: "advanced", strings: [5, 4, 3, 2, 1], bpm: 60 }, after: [
      "The strings are new, but the pick still skips one string, and each string still starts on a downstroke.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Hold the G chord and play the drill from exercise 3 on it. The low E, D and B strings give G, D and B, the notes of the G chord, as a wide arpeggio.",
      "Start each string on an upstroke instead: up, down.",
      "Skip two strings: from the low E string to the G string, then from the A string to the B string.",
    ] },
    { type: "p", text: "Soon your pick finds a string two away as surely as the one next door." },
  ],
};
