import type { CourseArticle } from "../model";

/** Course section `sing-then-find`, written in the /learn articles' style. */
export const singThenFind: CourseArticle = {
  updated: "2026-11-28T02:31",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "Tab tells you where every note is (see the [Melodies in tab](/course/4/melodies) section). In this section your ear does: sing a short tune first, then find it on the neck, starting from Do." },
    { type: "p", text: "It's slow at first, and that's the point. Each note you find by ear joins up what you hear with where your fingers go, and that's how a tune you can hum becomes a tune you can play." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first — [tuner](/tuner).",
      "Sing quietly, in the comfortable middle of your voice. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Three notes home", lines: [
      "Press the Play button below to hear the tune: the mic starts with it. It's three long notes, Mi, Re and Do. Sing along on the note names.",
      "Then press the Tune button below to mute the tune, and sing it over the chords alone. Practice until you can sing it without the tune leading you.",
      "Once that feels easy, press the Chords button to mute the chords too, and sing the tune a cappella.",
    ], tool: { type: "melody-singer", pick: { stage: "mi", index: 1 }, key: "g", voice: "tenor", bpm: 40 }, between: [
      "Now find it. Every dot on the neck below is a note of G major, and the ringed dots are G, your Do. Play the open G string: that's Do.",
      "Sing Mi, then climb the G string one dot at a time until the note you play matches your voice. Then find Re the same way, and come home to Do.",
    ], beside: { type: "scale-neck", scale: "major-ionian", key: "g", placement: { by: "open" }, highlight: ["1"] }, parts: [
      { title: "Check it", lines: [
        "Press the Play button below to hear the tune and see it in the tab, then play along.",
        "If one of your frets was different, play the tab's note and sing it, then find it again from Do.",
      ], tool: { type: "guitar-play-along", shape: { shape: "melody", tune: 3, key: "g" }, bpm: 50, view: "tab" } },
    ] },

    { type: "exercise", title: "2. Down from Sol", lines: [
      "This tune starts on Sol and steps down to Do. Tap its first note below to hear it.",
      "Then press the Play button below to hear the tune: the mic starts with it. Sing along on the note names.",
      "Then press the Tune button below to mute the tune, and sing it over the chords alone. Once that feels easy, press the Chords button to mute the chords too, and sing it a cappella.",
    ], tool: { type: "melody-singer", pick: { stage: "sol", index: 0 }, key: "g", voice: "tenor", bpm: 40 }, between: [
      "Play the open G string for Do, then sing Sol. Climb from Do, up the G string and on to the B string, until the note you play matches Sol.",
      "From Sol, find each note on the way down by ear. Practice until you can find the tune without the tab.",
    ], beside: { type: "scale-neck", scale: "major-ionian", key: "g", placement: { by: "open" }, highlight: ["1"] }, parts: [
      { title: "Check it", lines: [
        "Press the Play button below to hear the tune and see it in the tab, then play along and check your frets.",
      ], tool: { type: "guitar-play-along", shape: { shape: "melody", tune: 16, key: "g" }, bpm: 50, view: "tab" } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing a tune from [Step melodies](/course/3/step-melodies), then find it from the open G string.",
      "Find the same three notes from the G on the low E string, 3rd fret: Re is the open A string and Mi is the A string at the 2nd fret.",
      "Hum the start of a song you know, find its last note first, then work out the rest from there.",
    ] },
    { type: "p", text: "First you hunt for every note. Then you start to guess the right fret first time, because your ear already knows how far each step is." },
  ],
};
