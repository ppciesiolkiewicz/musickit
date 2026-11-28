import type { CourseArticle } from "../model";

/** Course section `matching-a-pitch`, written in the /learn articles' style. */
export const matchingAPitch: CourseArticle = {
  updated: "2026-11-27T20:49",
  versions: { agents: 2, teaching: 13, voice: 5 },
  sings: true,
  blocks: [
    { type: "p", text: "Matching a pitch is singing the note you hear, right on it. It's what lets you sing a tune back, or tune a string by ear." },
    { type: "p", text: "You don't need to hear it perfectly to start. The mic draws your voice as a line over the note, so you can see if you're under or over and nudge it. When you're right on the drone, the two blend into one sound and the wobble goes away." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
    ] },

    { type: "exercise", title: "1. One note, right on it", lines: [
      "Press the Start microphone button below to start the mic. Then press the Play button beside the drone to hear G, your Do.",
      "Hum the low Do, then open it to \"oo\" and hold it. Watch your line: nudge it up or down until it sits on the note.",
      "Practice until you can land on Do and hold it without the line drifting.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", enable: ["1"], others: "hidden", drone: true } },

    { type: "exercise", title: "2. Sing your open strings", lines: [
      "Press the Play button below to hear the six open strings, low E up to high e and back: the mic starts with it.",
      "Sing along on \"oo\", one long note for each string. If a string sits too low or too high for you, hum it quietly or let it go by.",
      "Then play each open string on your guitar and sing it back before the next one.",
    ], tool: { type: "string-singer", drill: "strings" }, after: [
      "_Don't reach for high notes: the high e can wait until it feels easy._",
    ] },

    { type: "exercise", title: "3. Hear two notes, sing them back", lines: [
      "Press the Start button below: the piano plays Do and then a second note, and the mic starts.",
      "Sing the second note back on \"oo\" and hold it until Yes shows. Then press the Next button below for another one.",
      "If you land under the note, sing Do first and slide up to it slowly.",
    ], tool: { type: "interval-singer", level: "new", key: "g", voice: "tenor", play: "both", picker: false } },

    { type: "guide", slug: "pitch-matching-exercises", text: "Want more? This guide has six pitch matching exercises, from one note to quick runs." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Open the [tuner](/tuner), play a string, then sing it and see if the tuner names the same note.",
      "Sing the note first, then play it on your guitar to check.",
      "Close your eyes on the first exercise, then look at your line.",
    ] },
    { type: "p", text: "First the start of each note gets closer, then long notes stay steady." },
  ],
};
