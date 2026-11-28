import type { CourseArticle } from "../model";

/** Course section `sight-singing`, written in the /learn articles' style. */
export const sightSinging: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "Sight-singing is reading a tune from the staff and singing it before you've heard it. With the leaps from [Singing leaps](/course/6/singing-leaps) in your voice, you can sing most of what the staff shows you." },
    { type: "p", text: "You don't read every note by name. You find the first note, then read each move: a step to the next line or space, a skip over one, a leap further. The [staff](/course/3/staff) already showed you where each note sits." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the tunes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Steps from the staff", lines: [
      "Before you press Play, tap the first note of the tune below to hear it. It's Mi.",
      "Each note after it is the same note again or one step higher or lower: from a line to the space next to it, or from a space to the line. Sing the tune from the staff on the note names, at your own pace.",
      "Then press Play below to hear the tune, and check what you sang against it.",
    ], tool: { type: "melody-singer", pick: { stage: "sol", index: 4 }, key: "g", voice: "tenor", bpm: 40, chords: false }, after: [
      "Practice until what you sing matches the tune when you press Play.",
      "If you lose your place, tap the note you stopped on and go on from there.",
    ] },

    { type: "exercise", title: "2. Skips from the staff", lines: [
      "This tune starts on Do and skips through Do, Mi and Sol. On the staff a skip goes from a line to the next line, or from a space to the next space.",
      "Tap its first note below to hear Do. Sing the tune from the staff on the note names, then press Play below to check.",
      "Practice until you read a skip as quickly as a step.",
    ], tool: { type: "melody-singer", pick: { stage: "skips", index: 3 }, key: "g", voice: "tenor", bpm: 40 } },

    { type: "exercise", title: "3. Rhythm from the staff", lines: [
      "This tune starts on Sol, and its notes have four lengths: one beat, two beats, the long Do at the end, and two eighths joined by a beam on one beat.",
      "Press Tune below to mute the tune. Then press Play below: the metronome and the chords start, and the mic with them.",
      "Sing the tune from the staff on the note names, in time with the metronome. Then press Tune to hear the tune again and check.",
    ], tool: { type: "melody-singer", pick: { stage: "la", index: 4 }, key: "g", voice: "tenor", bpm: 40, metronome: true }, after: [
      "Practice until the two eighths fit inside one click.",
      "If they rush, clap the rhythm with the metronome first, then sing it.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing each tune again on \"la\" instead of the note names.",
      "Read a tune with your eyes only, hearing it in your head, then press Play to check.",
      "Write a four-bar tune of steps and skips that ends on Do, and sing it back from the page.",
    ] },
    { type: "p", text: "First the steps read themselves. Then skips stop needing a count, and a new tune comes out right the first time more often." },
  ],
};
