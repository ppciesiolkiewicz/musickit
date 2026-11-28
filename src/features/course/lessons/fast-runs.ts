import type { CourseArticle } from "../model";

/** Course section `fast-runs`, written in the /learn articles' style. */
export const fastRuns: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "In [Runs](/course/6/vocal-runs) you sang short runs slowly: Do up to Sol and back, the home chord, turns. This page takes them further: over the pentatonic notes, past the high Do, through the whole scale, and then faster." },
    { type: "p", text: "A fast run is a slow run you no longer have to think about. So every run here starts at 40 bpm, and the speed comes last." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first. The [vocal warm-ups](/learn/vocal-warm-ups) take five minutes.",
      "Sing lightly. A run gets faster, not louder.",
      "Each pass starts a semitone higher, and the last one reaches the top of your range. Let a pass go when it feels tight.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. Over the pentatonic notes", lines: [
      "The major pentatonic scale is the major scale without Fa and Ti: Do, Re, Mi, Sol and La. With those two gone, no two notes sit a half step apart, so each note has room when the run gets quick.",
      "Press Play below to hear the run: two chords set the key, and the mic starts with them. It comes down from the high Do over those five notes and ends through Re on Do, four notes per beat.",
      "Sing along on \"oo\". If the notes smear into each other, sing one pass on \"la\", then go back to \"oo\".",
      "Practice until you can hear each of the five notes on its own.",
    ], tool: { type: "run-singer", pick: { difficulty: "hard", stage: "pentatonic-run" }, voice: "tenor", bpm: 40 }, after: [
      "_Don't reach for high notes: let a pass go when its top stops feeling easy._",
    ] },

    { type: "exercise", title: "2. Past the high Do", lines: [
      "Press Play below to hear the run: from Do up the whole scale, past the high Do to the Re above it, and back down to Do, four notes per beat.",
      "Sing along on \"ah\" low down, and change to \"oo\" for the top of the run.",
      "The run reaches the high Re by step, so there's no leap to it. Practice until the top of the run sounds as light as the bottom.",
    ], tool: { type: "run-singer", pick: { difficulty: "medium", stage: "nine" }, voice: "tenor", bpm: 40 } },

    { type: "exercise", title: "3. The whole scale, then faster", lines: [
      "Press Play below to hear the run: up the whole scale from Do to the high Do, straight back down past Do to the Ti under it, and home, four notes per beat. Sing along on \"ah\".",
      "Listen for the two half steps, Mi to Fa and Ti to Do. Every other step is a whole step, and a fast run goes out of tune where those two come out too wide.",
      "Practice until every note of the run has its own pitch. Then use the Tempo selector below to speed it up, one tempo at a time.",
      "If the notes blur at a new tempo, go back to the one before.",
    ], tool: { type: "run-singer", pick: { difficulty: "hard", stage: "octave-run" }, voice: "tenor", bpm: 40 } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Turn the pentatonic run round: start on Do and run up the five notes to the high Do.",
      "Sing a run on the note names, then on \"la\", then on one word from a song you like.",
      "Put a pentatonic run on the last word of a song you know, and end it on Do.",
    ] },
    { type: "p", text: "First the half steps stop smearing. Then the faster tempos stop feeling rushed, and the top of a run stops feeling like a reach." },
  ],
};
