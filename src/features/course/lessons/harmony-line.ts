import type { CourseArticle } from "../model";

/** Course section `harmony-line`, written in the /learn articles' style. */
export const harmonyLine: CourseArticle = {
  updated: "2026-11-28T02:29",
  versions: { agents: 3, teaching: 14, voice: 6 },
  sings: true,
  blocks: [
    { type: "p", text: "In [Sight-singing melodies](/course/6/sight-singing) you sang one line. A harmony line is a second one, sung with the tune on notes that fit the chords. It's what a backing singer sings." },
    { type: "p", text: "Finding your note isn't the hard part. Keeping it is, while another note pulls at your ear. So this page starts with one held note and builds up to a line that moves over the chords." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Hold Sol over Do", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Tap the ringed Sol to hear it. Then sing it on \"oo\" and hold it for one easy breath while the drone holds Do.",
      "Practice until your line stays level while the drone sounds under it.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["1", "5"], highlight: ["5"], labels: "solfege", drone: true }, after: [
      "_Don't reach for high notes: take the Sol just above the low Do._",
    ] },

    { type: "exercise", title: "2. Do under a tune", lines: [
      "This tune starts on Sol and steps down to Do. Press Play below to hear the tune: the mic starts with it. Sing along on the note names a few times.",
      "Then tap the last note of the tune below to hear Do. Press Play below again, and hold that Do on \"oo\" from the first note to the last.",
      "The staff marks the tune's notes, not yours, so listen: the tune starts a 5th above you and steps down until it meets your note.",
      "Practice until your Do stays put while the tune moves.",
    ], tool: { type: "melody-singer", pick: { stage: "sol", index: 0 }, key: "g", voice: "tenor", bpm: 40, chords: false } },

    { type: "exercise", title: "3. A 3rd above the tune", lines: [
      "This tune goes Do Re Mi Re Do. The harmony a 3rd above it goes Mi Fa Sol Fa Mi: each note a skip above the tune's.",
      "Press Play below to hear the tune: the mic starts with it. Sing along on the note names once.",
      "Then press Play below again and sing the harmony, Mi Fa Sol Fa Mi, on the note names.",
    ], tool: { type: "melody-singer", pick: { stage: "mi", index: 0 }, key: "g", voice: "tenor", bpm: 40, chords: false }, after: [
      "Practice until you can hold the harmony while the tune plays.",
      "If you slide down onto the tune, sing Mi Fa Sol Fa Mi on your own once, then press Play and try again.",
    ] },

    { type: "exercise", title: "4. A line over the chords", lines: [
      "Now the chords G, C, D and back to G, a bar each. A harmony line takes a note from each chord and moves as little as it can.",
      "Press Start microphone below to start the mic.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["2", "3", "4"], labels: "solfege" },
    between: [
      "Press Play on the backing track below to start the chords. Sing one long note a bar on \"oo\": Mi over the G chord, Fa over the C chord, Re over the D chord, then Mi again.",
    ],
    beside: { type: "backing-track", key: "g", numerals: ["I", "IV", "V", "I"], style: "ballad", bpm: 60, parts: { drums: "on", bass: "off", keys: "always" } }, after: [
      "Practice until each note is ready before its chord arrives.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing the harmony of the third exercise an octave lower: Mi Fa Sol Fa Mi under the tune. Now it's a 6th under the tune instead of a 3rd above.",
      "Over the backing track, pick your own note from each chord, and move by step where you can.",
      "Hum a 3rd above a song you know while it plays.",
    ] },
    { type: "p", text: "First your note stops sliding onto the tune. Then you start to hear the harmony lines in songs you know." },
  ],
};
