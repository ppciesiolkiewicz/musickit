import type { CourseArticle } from "../model";

/** Course section `la-minor-home`, written in the /learn articles' style. */
export const laMinorHome: CourseArticle = {
  updated: "2026-11-27T20:48",
  sings: true,
  blocks: [
    { type: "p", text: "Sing down from Do: Do, Ti, La. Stop on La and it feels like home too, only darker. La is the minor home." },
    { type: "p", text: "In G major, La is E. So E minor uses the same seven notes as G major: E, F♯, G, A, B, C and D. It's called the relative minor of G major: same notes, a different home." },
    { type: "p", text: "That's why the Em and G chords sit so well together. The Em chord is La, Do and Mi. The G chord is Do, Mi and Sol." },

    { type: "exercise", title: "1. Two home chords", lines: [
      "Press a chord box below to hear the chord. Play the G chord, then the Em chord, on your guitar too.",
      "Practice until you can say \"Do\" or \"La\" from the sound alone: the G chord is the major home, the Em chord the minor one.",
    ], tool: { type: "chord-shapes", chords: ["G", "Em"] } },

    { type: "h2", text: "Before you sing" },
    { type: "list", items: [
      "Sing quietly, in the comfortable middle of your voice.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "2. Rest on Do, rest on La", lines: [
      "Press Start microphone below to start the mic. The staff shows G major, with the notes under the lowest Do too.",
      "Sing Mi, Re, Do and stop: the line rests on Do. Then sing Do, Ti, La and stop on the ringed La. Sing it on the note names.",
      "Hold each last note for a breath and listen. Do sounds bright and finished. La sounds finished too, but darker.",
    ], tool: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", under: true, highlight: ["1", "6"], labels: "solfege" } },

    { type: "exercise", title: "3. A drone on La", lines: [
      "Press Play below to start the drone on La. Then press Start microphone on the staff below.",
      "Sing from the low La up to Mi on \"oo\", one note at a time, and come back down to La.",
      "Practice until La sounds like the note the line has to end on.",
    ], tool: { type: "backing-band", bpm: 60, key: "e", parts: { drone: "always" } },
    beside: { type: "staff", scale: "major-ionian", key: "g", voice: "tenor", under: true, notes: ["6", "7", "1", "2", "3"], highlight: ["6"], labels: "solfege" }, after: [
      "_Don't reach for low notes: hum the lowest ones if they feel rough._",
    ] },

    { type: "guide", slug: "major-and-minor-chords", text: "Want to hear major and minor side by side? This guide plays them over a backing track, and asks you where the music rests." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Strum the Em chord and sing La, Do and Mi over it. Then strum the G chord and sing Do, Mi and Sol.",
      "Make up a short tune from G major's notes and end it on La. Then end the same tune on Do.",
      "Hum the last note of a sad song you know. Is it La?",
    ] },
    { type: "p", text: "First you hear La as the bottom of a scale. Then it starts to sound like home, and minor songs make more sense." },
  ],
};
