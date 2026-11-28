import type { CourseArticle } from "../model";

/** Course section `home-note`, written in the /learn articles' style. */
export const homeNote: CourseArticle = {
  updated: "2026-11-27T20:48",
  versions: { agents: 2, teaching: 13, voice: 5 },
  sings: true,
  blocks: [
    { type: "p", text: "Do is the home note of a key: the note a tune wants to end on. In G major, Do is G." },
    { type: "p", text: "Once you can hear Do, you can hear where every other note sits. Some notes rest, some lean back towards home. That pull is what makes a tune sound finished or unfinished." },
    { type: "p", text: "A **drone** helps: one note, Do, held under you the whole time. It keeps home in your ear while you sing." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. Hold Do over the drone", lines: [
      "Press the Start microphone button below to start the mic. Then press the Play button beside the drone to hear Do.",
      "Sing the low Do on \"oo\" and hold it. Slide a little above it and a little below, and listen for the wobble.",
      "When your note matches the drone, the wobble stops and the two blend into one smooth sound. Practice until you can find that smooth spot straight away.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", enable: ["1"], others: "hidden", labels: "solfege", drone: true } },

    { type: "exercise", title: "2. Every note leans home", lines: [
      "Press the Play button beside the drone below. Sing Re and hold it for a breath, then step down to Do. Sing it on the note names.",
      "Now sing Ti, the note just under Do, and step up to Do. Then try Mi, Fa and Sol, each followed by Do.",
      "Listen for which notes want to move and which can rest. Re and Ti pull hardest. Mi and Sol can stay where they are.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", notes: ["7", "1", "2", "3", "4", "5"], under: true, highlight: ["1"], labels: "solfege", drone: true }, after: [
      "_Don't reach for high notes: stop at Sol if the top feels tight._",
    ] },

    { type: "exercise", title: "3. Hum the last note", lines: [
      "Every tune below ends on Do. Press the Play button below to hear the tune: the mic starts with it. Sing along on the note names.",
      "Then press the Play button again and stop singing just before the end. Hum the note you think comes next, and let the tune check you.",
      "Practice until you can hum Do before the tune gets there.",
    ], tool: { type: "melody-singer", pick: { stage: "mi", index: 0 }, key: "g", voice: "tenor", bpm: 40 } },

    { type: "guide", slug: "scale-degree-feelings", text: "Want to hear what every note of the scale feels like against Do? This guide goes through them one by one." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Play the open G string and sing Do over it. Then hum it without the guitar and check.",
      "Hum the last note of a song you know. That's usually its Do.",
      "Over the drone, make up a short tune from Do, Re and Mi, and end it on Do.",
    ] },
    { type: "p", text: "First Do gets easy to find. Then you start to hear it under songs, even when nobody plays it." },
  ],
};
