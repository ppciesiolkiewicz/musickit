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
  blocks: [
    { type: "p", text: "Most of us learn a scale as one position: a block of frets to run up and down. But the neck doesn't stop there. The same notes come back all the way up, and small groups of them come back together." },
    { type: "p", text: "I call those groups **islands**: three notes around a root, under one hand. Below, A minor and A major sit side by side, with two islands of the same scale notes framed on both. Play one island, then the other one up the neck: same notes, same tune, just higher or lower." },

    { type: "h2", text: "How to read the neck" },
    { type: "list", items: [
      "A minor is on the left and A major on the right. On a phone, A minor is on top.",
      "The low E string is at the bottom, as you see it looking down at your guitar.",
      "Each island has a frame and a number. Press its button under the neck, Island 1 for the first, to hear it.",
      "The key under each neck says what the frames, the red circles and the faded dots mean. Tap any dot to hear it.",
    ] },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first.",
      "Play slowly and lightly. Ten easy minutes beat an hour of tired hands.",
    ] },
    { type: "care", text: "Stop if your hand or wrist aches: shake it out and come back later." },

    { type: "exercise", title: "1. The 1st, 4th and 5th in minor and major", lines: [
      "Each island holds A, D and E: the 1st, 4th and 5th notes of the scale, or Do, Fa and Sol. They are in both scales, so the islands sit on the same frets on both necks.",
      "Press Island 1 under the left neck to hear Do Fa Sol and back to Do. Then press Island 2.",
      "Play each island on your guitar, slowly, and sing along on the note names.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["1", "4", "5"], count: 2 } },
    beside: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1", "4", "5"], count: 2 } } },

    { type: "h2", text: "Where major and minor differ" },
    { type: "p", text: "A major and A minor share A, B, D and E: the 1st, 2nd, 4th and 5th. The other three notes, the 3rd, 6th and 7th, sit one fret lower in minor. An island with one of them in it shows the difference under one hand." },

    { type: "exercise", title: "2. ♭7, 1 and 2 against 7, 1 and 2", lines: [
      "On the left, each island is G, A and B: the ♭7 under the root, the root, and the 2nd above it. On the right, in A major, the 7th is G♯, one fret under A.",
      "Press Island 1 under the left neck, then play it on your guitar: G, A, B and back to A.",
      "Then press Island 1 under the right neck and play it: G♯, A, B and back to A.",
      "Listen for the step up to A: two frets in minor, one in major.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["b7", "1", "2"], count: 2 } },
    beside: { type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["7", "1", "2"], count: 2 } }, after: [
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
