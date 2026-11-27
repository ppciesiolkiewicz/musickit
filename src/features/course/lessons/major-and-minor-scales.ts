import type { CourseArticle } from "../model";

/** Course section `major-and-minor-scales`, written in the /learn articles' style. */
export const majorAndMinorScales: CourseArticle = {
  updated: "2026-11-27T20:57",
  sings: true,
  blocks: [
    { type: "p", text: "In [Major or minor?](/course/3/major-or-minor) one note, the 3rd, turned a bright chord dark. A scale works the same way, with three notes instead of one." },
    { type: "p", text: "Start both scales on the same home note, G. The G minor scale lowers the 3rd, the 6th and the 7th of G major by a half step, one fret. The other four notes stay where they are." },
    { type: "list", items: [
      "G major: G A **B** C D **E** **F♯**",
      "G minor: G A **B♭** C D **E♭** **F**",
    ] },
    { type: "p", text: "Same home, same 1st, 2nd, 4th and 5th. Those three lowered notes are the whole difference between bright and dark." },

    { type: "exercise", title: "1. Two scales from one G", lines: [
      "Here is G major on the piano, and G minor under it. The 3rd, 6th and 7th each sit one key lower in minor.",
      "Tap each key of G major from left to right, then the same in G minor. Listen for where the two start to differ: the third note.",
    ], tool: { type: "piano-keys", key: "g", scale: "major-ionian" }, beside: { type: "piano-keys", key: "g", scale: "natural-minor-aeolian" } },

    { type: "h2", text: "Before you sing" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
      "Stop if your throat feels tight. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "2. Sing major, then minor", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear G, your Do.",
      "Sing up the G major scale from the low Do, slowly, on the note names. Hold the ringed notes a little longer.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", highlight: ["3", "6", "7"], drone: true },
    between: [
      "Now do the same on the G minor staff. The ringed notes are Me, Le and Te, each a half step under Mi, La and Ti.",
    ],
    beside: { type: "staff", scale: "natural-minor-aeolian", key: "g", voice: "tenor", highlight: ["b3", "b6", "b7"], drone: true },
    after: [
      "Practice until you can hear the change coming on the third note, before you sing it.",
      "_Don't reach for high notes: turn back at the next Do up._",
    ] },

    { type: "exercise", title: "3. Both scales on the neck", lines: [
      "Both necks start on the G on the low E string, 3rd fret. G major is on top, G minor under it.",
      "Play G major from the low G up to the next G on the D string, 5th fret, and back down. Then play G minor the same way.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "g", placement: { by: "root", string: 6 }, highlight: ["3", "6", "7"] },
    between: [
      "In G minor those three notes are each a fret lower: B to B♭, E to E♭, F♯ to F. Some of them now sit on another string, so follow the ringed dots.",
    ],
    beside: { type: "scale-neck", scale: "natural-minor-aeolian", key: "g", placement: { by: "root", string: 6 }, highlight: ["b3", "b6", "b7"] },
    after: [
      "Practice until you can play G minor up and back down without looking for the ringed notes.",
    ] },

    { type: "guide", slug: "major-and-minor-scales-guitar", text: "Want both scales all over the neck? This guide follows A major and A minor up to the 12th fret." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Sing G major up and G minor down, in one breath.",
      "Play a tune you know in major, then lower its 3rds, 6ths and 7ths and play it in minor.",
      "Start both scales on the open A string instead, and find the three lowered notes yourself.",
    ] },
    { type: "p", text: "First the 3rd gets easy to hear. Then you start to notice the 6th and 7th in songs too." },
  ],
};
