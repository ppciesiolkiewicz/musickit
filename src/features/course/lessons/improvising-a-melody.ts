import type { CourseArticle } from "../model";

/** Course section `improvising-a-melody`, written in the /learn articles' style. */
export const improvisingAMelody: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "In [Do–Mi–Sol](/course/3/do-mi-sol) you skipped through the home chord, and in [A harmony line](/course/6/harmony-line) you sang your own line over chords. Put the two together and you can make up a tune of your own." },
    { type: "p", text: "The trick is where your notes land. A chord tone sounds right over its chord, so if each phrase lands on one, the notes in between can go almost anywhere." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the middle of your voice. A made-up tune wanders, so keep it where it feels easy.",
      "Headphones help: the mic hears your voice, not the backing track.",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. One chord, three notes", lines: [
      "Press Play below to start the backing track: the G chord, round and round. Its notes are G, B and D: Do, Mi and Sol in G major.",
    ], tool: { type: "backing-track", key: "g", chords: ["G"], style: "ballad", bpm: 72, parts: { drums: "on", bass: "off", keys: "always" } }, between: [
      "Press Start microphone on the staff below to start the mic. Make up a tune from Do, Mi and Sol only, in any order and any rhythm. Sing it on \"la\".",
      "Practice until the tune comes without you planning the next note.",
    ], beside: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "3", "5"] }, after: [
      "_Don't reach for high notes: keep to the Do, Mi and Sol that feel easy._",
    ] },

    { type: "exercise", title: "2. When the chord changes", lines: [
      "Press Play below to start the backing track: two bars of the G chord, then two bars of the C chord. The C chord's notes are C, E and G: Fa, La and Do.",
    ], tool: { type: "backing-track", key: "g", numerals: ["I", "I", "IV", "IV"], style: "ballad", bpm: 72, parts: { drums: "on", bass: "off", keys: "always" } }, between: [
      "Press Start microphone on the staff below. Make up a tune from Do, Mi and Sol over the G chord, and from Fa, La and Do over the C chord. Sing it on \"la\".",
      "The ringed Do is in both chords, so it's the safe note when you lose your place. Practice until your notes change as the chord changes, not after it.",
    ], beside: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "3", "4", "5", "6"], highlight: ["1"] } },

    { type: "exercise", title: "3. Question and answer", lines: [
      "Press Play below to start the backing track: the chords G, D, C and G, a bar each. The D chord's notes are D, F♯ and A: Sol, Ti and Re.",
    ], tool: { type: "backing-track", key: "g", numerals: ["I", "V", "IV", "I"], style: "ballad", bpm: 72, parts: { drums: "on", bass: "off", keys: "always" } }, between: [
      "Press Start microphone on the staff below. The ringed notes are where the phrases end. Over the first two bars, sing a short phrase that ends on Re or Ti as the D chord plays: it sounds like a question. Over the last two bars, answer it and land on Do as the G chord comes back. Sing it on \"la\".",
      "Leave a gap after each phrase, the way you would in a conversation. If the answer lands late, make it shorter.",
      "Practice until the answer lands on Do as the G chord arrives, without you counting the bars.",
    ], beside: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", highlight: ["1", "2", "7"] } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Swap them round: end the question on Do and the answer on Re, and listen to the tune stay open.",
      "Sing a phrase, then find the same notes on your guitar and play it back.",
      "Leave a whole bar empty now and then. A gap is part of the tune too.",
    ] },
    { type: "p", text: "First you stop planning each note. Then you start to hear where a phrase wants to land before you get there." },
  ],
};
