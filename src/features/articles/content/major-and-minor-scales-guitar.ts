import type { Article } from "../model";

export const majorAndMinorScalesGuitar: Article = {
  slug: "major-and-minor-scales-guitar",
  title: "Major and minor scales side by side on the guitar neck",
  metaTitle: "Major vs Minor Scale on Guitar: A Visual, Interactive Neck · attunr",
  description: "A major and A minor on an interactive guitar neck, one above the other. Tap a note to hear it and play small islands of notes that come back all over the neck.",
  intro: "A visual, interactive look at A major and A minor on the whole neck, with a few small islands of notes to play and hear. Part 1 of a series on knowing one key all over the neck.",
  updated: "2026-11-26",
  sings: false,
  topics: ["guitar", "theory"],
  blocks: [
    { type: "p", text: "Most of us learn a scale as one position: a block of frets to run up and down. But the neck doesn't stop there. The same notes come back all the way up, and small groups of them come back together." },
    { type: "p", text: "I call those groups **islands**: three notes around a root, under one hand. Below, A major and A minor sit one above the other, with islands of the same scale notes framed on both. Play one island, then another one up the neck: same notes, same tune, just higher or lower." },

    { type: "h2", text: "How to read the neck" },
    { type: "list", items: [
      "Each dot is a note of the scale. Tap one to hear it.",
      "The low E string is at the bottom, as you see it looking down at your guitar.",
      "The white dots are A, the root: Do, the home note.",
      "Each island has a frame and a number. Press its button under the neck, Island 1 for the first, to hear it.",
      "Red circles mark the other A notes: more places an island can start from.",
    ] },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first.",
      "Play slowly and lightly. Ten easy minutes beat an hour of tired hands.",
    ] },
    { type: "care", text: "Stop if your hand or wrist aches: shake it out and come back later." },

    { type: "exercise", title: "1. A major: the 1st, 4th and 5th", lines: [
      "This is the A major scale on the whole neck. Each island holds A, D and E: the 1st, 4th and 5th notes of the scale, or Do, Fa and Sol.",
      "Press Island 1 below to hear Do Fa Sol and back to Do. Then press Island 2 and Island 3.",
      "Play each island on your guitar, slowly, and sing along on the note names.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "4", "5"] } } },

    { type: "exercise", title: "2. A minor: the same three notes", lines: [
      "Now the A minor scale. A, D and E are in both scales, so the islands sit on the same frets as in A major above.",
      "Press Island 1 below, then play it on your guitar. Do the same with Island 2 and Island 3.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["1", "4", "5"] } } },

    { type: "h2", text: "Where major and minor differ" },
    { type: "p", text: "A major and A minor share A, B, D and E: the 1st, 2nd, 4th and 5th. The other three notes, the 3rd, 6th and 7th, sit one fret lower in minor. An island with one of them in it shows the difference under one hand." },

    { type: "exercise", title: "3. A major: 7, 1 and 2", lines: [
      "Each island here is G♯, A and B: the 7th under the root, the root, and the 2nd above it. G♯ sits one fret under A.",
      "Press Island 1 below to hear it, then play it on your guitar: G♯, A, B and back to A.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["7", "1", "2"] } } },

    { type: "exercise", title: "4. A minor: ♭7, 1 and 2", lines: [
      "In A minor the 7th is G, the ♭7, two frets under A. The rest of the island is the same.",
      "Press Island 1 below, then play it on your guitar: G, A, B and back to A. Then play the major island above and this one back to back.",
      "Listen for the step up to A: one fret in major, two in minor.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["b7", "1", "2"] } }, after: [
      "Practice until you can find an island from any red-circled A without counting frets.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Start on a red-circled A and build the island there yourself, then tap the dots to check.",
      "Make up a short tune from one island, then play the same tune in another island.",
      "From one A, play the island of the 1st, 4th and 5th, then the island of the ♭7, 1 and 2.",
    ] },
    { type: "p", text: "Before long you'll spot an A anywhere on the neck and know which notes sit around it." },
    { type: "p", text: "Next in this series: [Do Re Do in any key](/learn/scale-degrees-guitar-any-key), the smallest island, moved to E minor." },
  ],
};
