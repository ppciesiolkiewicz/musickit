import type { Article } from "../model";

export const pitchMatchingExercises: Article = {
  slug: "pitch-matching-exercises",
  title: "Pitch matching exercises for singers",
  metaTitle: "Pitch Matching Exercises for Singers, with Live Feedback · attunr",
  description: "Five pitch matching exercises you can sing right here, with your pitch drawn live over the note: a held Do, a slide, two agility runs and sing-back.",
  intro: "Sing a note, see where you landed, nudge it. Five exercises you can do right on this page.",
  updated: "2026-11-26",
  sings: true,
  blocks: [
    { type: "p", text: "Pitch matching is singing the note you hear, right on it. Lots of singers sit a little under or over on some notes without hearing it. Working on that precision is what makes a voice sound sure of itself." },
    { type: "p", text: "**Live feedback** helps: each exercise draws your voice as a line over the note, so you can nudge it until the two meet. When you're right on it, the wobble in the sound goes away." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Warm up first: [a five-minute routine](/learn/vocal-warm-ups).",
      "Sing quietly, in the comfortable middle of your voice.",
      "Ten focused minutes beat an hour of tired singing.",
      "Stop if your throat feels tight or sore. More in [Look after your voice](/voice-care).",
      "Pick your voice in **Your voice** above, so the notes sit where you can sing them.",
    ] },

    { type: "exercise", title: "1. One note, dead centre", lines: [
      "Press Start microphone below to start the mic. Then press Play beside the drone to hear Do.",
      "Sing the low Do on \"oo\" and hold it. Then slide a little sharp on purpose and back, then a little flat and back.",
      "Practice until you can land on the low Do and hold it without the line drifting.",
    ], tool: { type: "staff", scale: "major-ionian", key: "d", voice: "tenor", labels: "solfege", enable: ["1"], others: "hidden", drone: true } },

    { type: "exercise", title: "2. The siren to Sol", lines: [
      "On \"oo\", slide slowly from Do up to Sol and back, like a siren. Then sing the two as a clean jump.",
      "If Sol lands under the note, take a fresh breath before you jump.",
    ], tool: { type: "staff", scale: "major-ionian", key: "f", voice: "tenor", labels: "solfege", notes: ["1", "5"], drone: true }, after: [
      "_Don't reach for high notes: turn the siren round at Sol._",
    ] },

    { type: "exercise", title: "3. Agility: out from Do and back", lines: [
      "An agility warm-up: **Do Re Do, Do Mi Do, Do Fa Do, Do Sol Do.**",
      "Press Play below to hear the run: the mic starts with it. Sing along on the note names. Coming back to Do every time gives your ear a home to check against.",
      "Each pass starts a semitone higher. Switch to \"oo\" when it gets high.",
    ], tool: { type: "run-singer", pick: { stage: "out-from-do", index: 0 }, voice: "tenor" } },

    { type: "exercise", title: "4. Agility: Do between each step", lines: [
      "Same notes, quicker: **Do Re Do Mi Do Fa Do Sol, then Fa Mi Re Do.**",
      "Press Play below to hear the run: the mic starts with it. Sing along on the note names, and listen for each jump landing straight on its note.",
      "Then try it on \"oo\" for fun: same jumps, no names to lean on.",
    ], tool: { type: "run-singer", pick: { stage: "out-from-do", index: 1 }, voice: "tenor" }, after: [
      "_Don't reach for high notes: let a pass go when its top stops feeling easy._",
    ] },

    { type: "exercise", title: "5. Hear it, sing it back", lines: [
      "Press Start below to hear two notes. Sing both back on \"la\" before you answer: that's the pitch matching part.",
    ], tool: { type: "interval-ears", set: [3, 4, 7, 9], dir: "up" } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Go down instead: Do Ti Do, Do La Do, Do Sol Do.",
      "Hum the note first, then open to \"oo\".",
      "Sing with your eyes closed, then check your line.",
    ] },
    { type: "p", text: "First the start of each note gets cleaner, then long notes get steadier. Want this every day? [attunr](/) puts it in a short daily plan." },
  ],
};
