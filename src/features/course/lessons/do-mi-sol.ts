import type { CourseArticle } from "../model";

/** Course section `do-mi-sol`, written in the /learn articles' style. */
export const doMiSol: CourseArticle = {
  updated: "2026-11-27T20:48",
  sings: true,
  blocks: [
    { type: "p", text: "Do, Mi and Sol are the three notes of the home chord. In G major they're G, B and D: the notes of the G chord you already play." },
    { type: "p", text: "A tune that skips between them sounds settled, because it never leaves the chord. Lots of tunes start this way, so these skips are worth having in your ear and your voice." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Skip through the chord", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Sing Do, Mi, Sol, then back down Mi, Do. Sing it on the note names, and hold each note until your line settles on it.",
      "Then skip straight from Do to Sol and back, missing out Mi.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "3", "5"], highlight: ["1"], labels: "solfege", drone: true }, after: [
      "_Don't reach for high notes: start from the low Do when the high one feels tight._",
    ] },

    { type: "exercise", title: "2. Copy the skip", lines: [
      "Press Start below: the piano plays Do and then the note to sing, and the mic starts. It's Mi or Sol.",
      "Sing the second note back on \"oo\" and hold it until Yes shows. Then press Next below for another one.",
      "Practice until you can tell Mi from Sol before you sing it.",
    ], tool: { type: "interval-singer", key: "g", voice: "tenor", intervals: [4, 7], play: "both", picker: false } },

    { type: "exercise", title: "3. A tune that skips", lines: [
      "Press Play below to hear the tune: the mic starts with it. Listen once, then press Play again and sing along on the note names.",
      "Sing along with the tune a few times. Then press Tune below to mute the tune, and sing it over the chords alone.",
      "Once that feels easy, press Chords to mute the chords too, and sing the tune a cappella.",
    ], tool: { type: "melody-singer", pick: { stage: "skips", index: 0 }, key: "g", voice: "tenor", bpm: 40 } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Strum the G chord once and let it ring. Sing Do, Mi and Sol over it, then in any order you like.",
      "Make up a short tune from Do, Mi and Sol, and end it on Do.",
      "Sing Do Mi Sol and then the high Do above it: the whole chord, broken up.",
    ] },
    { type: "p", text: "First the skip up to Sol gets easier to land. Then you start to hear Do, Mi and Sol at the start of tunes you know." },
  ],
};
