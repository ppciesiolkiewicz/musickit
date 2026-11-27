import type { CourseArticle } from "../model";

/** Course section `steady-beat`, written in the /learn articles' style. */
export const steadyBeat: CourseArticle = {
  updated: "2026-11-27T20:48",
  sings: true,
  blocks: [
    { type: "p", text: "The beat is the steady pulse you tap your foot to. Beats come in groups of four, counted \"1 2 3 4\" and then again: each group is a bar." },
    { type: "p", text: "A steady beat matters more than any chord. A wrong note in time still sounds like music, and a right note late sounds like a mistake. So before the chords come in, I want your hands to keep time on their own." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sit so you can tap a foot, and let your shoulders drop.",
      "Count out loud. It feels silly for a day, then it's the thing that keeps you in time.",
    ] },

    { type: "exercise", title: "1. Tap on every beat", lines: [
      "Press Start below to begin a round at 60 bpm. The metronome counts one bar in, then a note comes on every beat. Press Space, or tap the lane, as each note reaches the line.",
      "Count \"1 2 3 4\" out loud as you tap, and tap your foot with it.",
      "A note turns green when your tap lands on the beat. Practice until most notes turn green without you trying hard.",
    ], tool: { type: "clap-along", level: "new", bpm: 60 }, after: [
      "When a round ends, read the line under the numbers: it says if your taps came early or late. Early means you're rushing, so wait for the click.",
    ] },

    { type: "exercise", title: "2. Two taps a beat: 1 & 2 &", lines: [
      "Now each beat splits in two. Press Start below and count \"1 & 2 & 3 & 4 &\", saying \"and\" for each &. Tap on every word.",
      "The numbers land on the click, and each \"and\" falls halfway to the next one.",
      "If the \"and\" taps come early, give each one its full half of the beat. Practice until they turn green as easily as the numbers.",
    ], tool: { type: "clap-along", level: "beginner", bpm: 60 } },

    { type: "exercise", title: "3. Strum the beat on muted strings", lines: [
      "Lay the fingers of your fretting hand lightly across all six strings, so they don't ring: you hear a short \"chk\".",
      "Press Start below: the mic opens, and the metronome counts one bar in and then stops. Strum down once on each beat as a note reaches the line, and keep the beat going yourself.",
      "If a strum leaves no mark under its note, strum a little harder or move closer to the mic.",
    ], tool: { type: "clap-along", level: "new", bpm: 60, input: "mic" }, after: [
      "This is the strumming hand you'll use for every chord in stage 2. Practice until the strums feel even without the click.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Put on a song you like and tap your foot to it. Count \"1 2 3 4\" and find where each bar starts.",
      "Strum the muted strings with two strums a beat, down on the numbers and up on each \"and\".",
      "For more rounds and other tempos, open the [rhythm game](/theory/rhythm).",
    ] },
    { type: "p", text: "First the green notes come when you concentrate. After a while they come while you're thinking about something else, and that's when the beat is yours." },
  ],
};
