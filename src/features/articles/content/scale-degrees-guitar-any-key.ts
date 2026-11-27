import type { Article } from "../model";

export const scaleDegreesGuitarAnyKey: Article = {
  slug: "scale-degrees-guitar-any-key",
  title: "Scale degrees on the guitar: Do Re Do in any key",
  metaTitle: "Scale Degrees on Guitar: One Shape, Any Key, Interactive · attunr",
  description: "Play Do Re Do in A minor, then in E minor, on a visual, interactive guitar neck. The same small shape, the same feeling, all over the neck and in any key.",
  intro: "A visual, interactive drill: one small island of notes, Do Re Do, found all over the neck in A minor and then in E minor. Part 2 of a series on knowing one key all over the neck.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar", "theory"],
  frets: 12,
  blocks: [
    { type: "p", text: "In [part 1](/learn/major-and-minor-scales-guitar) I framed small **islands** of notes on A major and A minor: three notes around a root, under one hand. This time it's the smallest island there is, two notes: Do and Re, the root and the note a step above it." },
    { type: "guide", slug: "major-and-minor-scales-guitar", text: "Haven't read part 1? Start there: it shows how to read the neck and its labels." },
    { type: "p", text: "Play Do Re Do anywhere on the neck and it sounds the same, just higher or lower. Move it to another key and it still sounds the same. That's what a scale degree is: a note named by its place from Do, not by its letter. More on that in [Learning music theory as a way of naming feelings](/learn/scale-degree-feelings)." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Tap any dot on the neck to hear it. Each dot is labelled by how far it is from Do, as an interval or in solfège: the root is {{1}}, R or Do, and the 2nd is {{2}}, Re.",
      "Each island has a frame and a number. Press its button under the neck, Island 1 for the first, to hear it.",
    ] },
    { type: "p", text: "Use the Labels selector at the bottom of this page to switch every dot between intervals and solfège." },

    { type: "exercise", title: "1. Do Re Do in A minor", lines: [
      "This is the A minor scale on the whole neck. Each island is {{1}} and {{2}}: A and B, Do and Re. The red circles mark every A.",
      "Press Island 1 below to hear Do and Re. Then play it on your guitar and sing along on the note names.",
      "Do the same with Island 2 and Island 3.",
      "Listen for the same little climb, each time higher.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["1", "2"] } } },

    { type: "exercise", title: "2. Do Re Do in E minor", lines: [
      "Now the E minor scale. Do is E and Re is F♯. Island 1 sits on the same frets as Island 1 in A minor, one string lower.",
      "Press Island 1 below, then play it and sing Do, Re. Then play the first island of A minor above and this one, one after the other.",
      "Listen for the climb: the same in both keys, only the starting note has moved.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "e", islands: { notes: ["1", "2"] } } },

    { type: "exercise", title: "3. Add the ♭7 under Do", lines: [
      "A bigger island in E minor: {{b7}}, {{1}} and {{2}}, D under Do, then E and F♯.",
      "Press Island 1 below to hear it rising from Do: Do, Re, the ♭7 above them and the Do above that. Play it on your guitar. Then do the same with Island 2.",
    ], tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: "e", islands: { notes: ["b7", "1", "2"], count: 2 } }, after: [
      "Practice until you can play an island from any red-circled E without counting frets.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Pick any note on the low E string as Do and play Do Re Do from it, two frets up and back.",
      "Sing Do Re Do first, then find it on the neck.",
      "Add the next note of the scale, the ♭3, one fret above Re, and play Do Re ♭3 Re Do.",
    ] },
    { type: "p", text: "Before long you'll hear Do Re Do in songs and know where to find it on the neck." },
    { type: "p", text: "That's how it went for me. Once I could sing short tunes like this, I heard them better in songs, and then I could play them on the guitar." },
    { type: "p", text: "Want the chords around these notes too? [The CAGED system](/learn/caged-system-guitar) shows one chord in five shapes up the neck." },
  ],
};
