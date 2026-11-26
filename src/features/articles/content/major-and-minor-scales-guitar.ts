import type { Article } from "../model";

export const majorAndMinorScalesGuitar: Article = {
  slug: "major-and-minor-scales-guitar",
  title: "Major and minor scales side by side on the guitar neck",
  metaTitle: "Major vs Minor Scale on Guitar: A Visual, Interactive Neck · attunr",
  description: "A minor and A major side by side on an interactive guitar neck. Tap a note to hear it and play small islands of notes that come back all over the neck.",
  intro: "A visual, interactive look at A major and A minor on the whole neck, with a few small islands of notes to play and hear. Part 1 of a series on knowing one key all over the neck.",
  updated: "2026-11-26",
  sings: false,
  topics: ["guitar", "theory"],
  labels: "interval",
  blocks: [
    { type: "p", text: "Most of us learn a scale as one position: a block of frets to run up and down. But the neck doesn't stop there. The same notes come back all the way up, and small groups of them come back together." },
    { type: "p", text: "I call those groups **islands**: three notes around a root, under one hand. Below, A minor sits on top of A major, with two islands of the same scale notes framed on both. Play one island, then the other one up the neck: same notes, same tune, just higher or lower." },

    { type: "h2", text: "How to read the neck" },
    { type: "list", items: [
      "A minor is on top and A major under it.",
      "The low E string is at the bottom, as you see it looking down at your guitar.",
      "Each dot is labelled with its interval: how far it is from A. {{1}} is A itself, the root. {{4}} and {{5}} are the 4th and 5th (p for perfect), {{2}} is the 2nd and {{b7}} the ♭7.",
      "Each island has a frame and a number. Press its button under the neck, Island 1 for the first, to hear it.",
      "The key under each neck says what the frames and the red circles mean. Tap any dot to hear it.",
    ] },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Play slowly and lightly. Ten easy minutes beat an hour of tired hands.",
    ] },
    { type: "care", text: "Stop if your hand or wrist aches: shake it out and come back later." },

    { type: "exercise", title: "1. The 1st, 4th and 5th in minor and major", lines: [
      "Each island holds {{1}}, {{4}} and {{5}}: A, D and E, the 1st, 4th and 5th notes of the scale, or Do, Fa and Sol.",
      "Press Island 1 under the A minor neck to hear Do, Fa, Sol and the Do above. Then press Island 2.",
      "Play each island on your guitar, slowly, and sing along on the note names.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["1", "4", "5"], count: 2 } },
    between: [
      "Note that this is exactly the same for both the minor and the major scale: {{1}}, {{4}} and {{5}} are in both, so the islands sit on the same frets.",
    ],
    beside: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "4", "5"], count: 2 } } },

    { type: "h2", text: "Where major and minor differ" },
    { type: "p", text: "A major and A minor share {{1}}, {{2}}, {{4}} and {{5}}: A, B, D and E. The other three notes, the 3rd, 6th and 7th, sit one fret lower in minor. An island with one of them in it shows the difference under one hand." },

    { type: "exercise", title: "2. ♭7, 1 and 2 against 7, 1 and 2", lines: [
      "In A minor, each island is {{b7}}, {{1}} and {{2}}: G under the root, A, and B above it. In A major the 7th is {{7}}, G♯, one fret under A.",
      "Press Island 1 under the A minor neck to hear it rising from A: A, B, G and the A above. Then play it on your guitar.",
      "Then press Island 1 under the A major neck and play it: A, B, G♯ and the A above.",
      "Listen for the last step up to A: two frets in minor, one in major.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["b7", "1", "2"], count: 2 } },
    beside: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["7", "1", "2"], count: 2 } }, after: [
      "Practice until you can find an island from any red-circled A without counting frets.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Start on a red-circled A and build the island there yourself, then tap the dots to check.",
      "Make up a short tune from one island, then play the same tune in another island.",
      "From one A, play the island of {{1}}, {{4}} and {{5}}, then the island of {{b7}}, {{1}} and {{2}}.",
    ] },
    { type: "p", text: "Before long you'll spot an A anywhere on the neck and know which notes sit around it." },
    { type: "p", text: "Next in this series: [Do Re Do in any key](/learn/scale-degrees-guitar-any-key), the smallest island, moved to E minor." },
  ],
};
