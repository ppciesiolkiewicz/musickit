import type { CourseArticle } from "../model";

/** Course section `step-melodies`, written in the /learn articles' style. */
export const stepMelodies: CourseArticle = {
  updated: "2026-11-28T02:31",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "In [The major scale as do-re-mi](/course/3/do-re-mi) you sang the whole scale, one note after the next. Most tunes move like that too: a step up, a step down, and home." },
    { type: "p", text: "Here are the first five notes of G major, Do up to Sol, one step at a time. Then short tunes made only of those steps, sung first and played after." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Do, Re and Mi", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Sing Do, step up to Re, then back to Do. Sing it on the note names.",
      "Then add Mi, the ringed note: Do, Re, Mi, Re, Do. Practice until each step up feels the same size.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "2", "3"], highlight: ["3"], labels: "solfege", drone: true } },

    { type: "exercise", title: "2. A tune from Mi", lines: [
      "This tune starts on Mi and steps down to Do. Tap its first note below to hear it.",
      "Then press Play below to hear the tune: the mic starts with it. Sing along on the note names.",
      "Then press Tune below to mute the tune, and sing it over the chords alone.",
      "Once the names come without thinking, sing it again on \"la\".",
    ], tool: { type: "melody-singer", pick: { stage: "mi", index: 3 }, key: "g", voice: "tenor", bpm: 40 } },

    { type: "exercise", title: "3. Up to Sol", lines: [
      "Press Play beside the drone below. Sing from Do up to Sol one step at a time, then step back down. Sing it on the note names.",
      "Hold Sol, the ringed note, for a moment at the top, and listen for it settling against the drone.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "2", "3", "4", "5"], highlight: ["5"], labels: "solfege", drone: true }, after: [
      "_Don't reach for high notes: start from the low Do, so Sol stays easy._",
    ] },

    { type: "exercise", title: "4. Sing it, then play it", lines: [
      "This tune climbs from Mi to Sol and steps back home. Press Play below to hear the tune: the mic starts with it.",
      "Sing along with the tune a few times. Then press Tune below to mute the tune, and sing it over the chords alone.",
      "Once that feels easy, press Chords to mute the chords too, and sing the tune a cappella.",
    ], tool: { type: "melody-singer", pick: { stage: "sol", index: 4 }, key: "g", voice: "tenor", bpm: 40 }, between: [
      "Now play the same tune on the guitar. Press Play below to hear it, and play along from the tab.",
      "Sing the note names quietly as you play. Practice until your fingers and your voice land on each note together.",
    ], beside: { type: "guitar-play-along", shape: { shape: "melody", tune: 20, key: "g" }, bpm: 50, view: "tab" } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Over the drone, make up a tune from Do to Sol that moves only by step, and end it on Do.",
      "Play the tune from exercise 2 on the G string: Mi at the 4th fret, Re at the 2nd, Do open. Sing the names as you play.",
      "Sing Do up to Sol and back on \"oo\" instead of the note names.",
    ] },
    { type: "p", text: "First each step needs the drone to check it. Then the five notes sit in your ear, and tunes that move by step start to sound easy to follow." },
  ],
};
