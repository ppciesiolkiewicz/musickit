import type { Article } from "../model";

export const cagedSystemGuitar: Article = {
  slug: "caged-system-guitar",
  title: "The CAGED system on guitar: one chord, five shapes",
  metaTitle: "CAGED System for Beginners: A Visual, Interactive Guide · attunr",
  description: "Learn the CAGED system on an interactive guitar neck: play the C chord in five shapes up the neck and find the Am chord in the same frets.",
  intro: "A visual, interactive guide to the CAGED system: the C chord played in five shapes, from the open position to fret 12, and the minor chord that sits in the same frets.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar", "theory"],
  blocks: [
    { type: "p", text: "You probably know the open chords C, A, G, E and D. Here's the surprise: those five shapes are all you need to play any chord anywhere on the neck." },
    { type: "p", text: "Here's the trick: take an open chord and play only the strings your fingers press. Slide those fingers up the neck together and you get the same chord higher up. Do it with all five shapes and they join end to end along the neck, always in the same order: C, A, G, E, D. That order is where the name CAGED comes from." },
    { type: "p", text: "With no open strings, the notes under your fingers are a movable shape: your hand carries the whole chord to any fret. CAGED is five movable shapes for one chord, joined end to end." },
    { type: "guide", slug: "movable-chord-shapes", text: "Never slid a chord shape up the neck? This guide starts with one shape and two chords." },
    { type: "p", text: "In this guide you'll play the C chord in all five shapes, then find the Am chord hiding in the same frets." },

    { type: "h2", text: "One chord, five shapes" },
    { type: "p", text: "Here is the C chord in all five shapes, from the open C chord up the neck. Press Play under each chord box to hear it: the same chord every time, a little higher each step." },
    { type: "chord-chain", chords: [
      { chord: "C", frets: "x 3 2 x 1 x | x 3 2 x 1 x", caption: "C shape" },
      { chord: "C", frets: "x x 5 5 5 x | x x 1 2 3 x", caption: "A shape" },
      { chord: "C", frets: "8 7 x x x 8 | 2 1 x x x 3", caption: "G shape" },
      { chord: "C", frets: "x 10 10 9 x x | x 2 3 1 x x", caption: "E shape" },
      { chord: "C", frets: "x x 10 12 13 12 | x x 1 2 4 3", caption: "D shape" },
    ] },
    { type: "p", text: "On the whole neck they join end to end. The neck map below shows every note of the C chord, each shape in its own colour, with a frame round the notes your fingers press in that shape. Tap any dot to hear it." },
    { type: "row", tools: [{ type: "caged-neck", key: "c", scale: "major-ionian", islands: true }] },
    { type: "p", text: "Now let's take the shapes one or two at a time." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Pluck only the strings your fingers press, one at a time or together. No barre needed.",
    ] },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "exercise", title: "1. The five open chords", lines: [
      "These are the five shapes CAGED is named after. Press each chord box below to hear it, then play it on your guitar.",
    ], tool: { type: "chord-shapes", chords: ["C", "A", "G", "E", "D"] }, after: [
      "Now play each one again, plucking only the strings your fingers press. Those notes are the shape you'll move up the neck.",
      "Practice until you can play each one without looking up the fingering.",
    ] },

    { type: "exercise", title: "2. The C chord in the C and A shapes", lines: [
      "Here is the C chord in the C shape: the three notes your fingers press in the open C chord. Press the chord box below to hear it, then play it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x 3 2 x 1 x | x 3 2 x 1 x"] },
    between: [
      "And here is the C chord again, in the A shape: the three fingers of the open A chord, moved up three frets. Press the chord box below to hear it, then play it.",
    ],
    beside: { type: "chord-shapes", chords: ["C"], frets: ["x x 5 5 5 x | x x 1 2 3 x"] }, after: [
      "Both are the C chord: every R is a C, on new strings.",
      "Practice until you can move from one shape to the other without stopping.",
    ] },

    { type: "exercise", title: "3. The C chord in the G and E shapes", lines: [
      "Next up the neck is the G shape: the three fingers of the open G chord, on the two lowest strings and the high e string, moved up five frets. Press the chord box below to hear it, then play it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["8 7 x x x 8 | 2 1 x x x 3"] },
    between: [
      "Then comes the E shape: the three fingers of the open E chord, moved up eight frets. Press the chord box below to hear it, then play it.",
    ],
    beside: { type: "chord-shapes", chords: ["C"], frets: ["x 10 10 9 x x | x 2 3 1 x x"] }, after: [
      "Practice until each note rings clearly, string by string.",
    ] },

    { type: "exercise", title: "4. The C chord in the D shape", lines: [
      "The last shape is the D shape: the three fingers of the open D chord, moved up ten frets. In the open D chord the root is the open D string, so here finger 1 presses it at fret 10. Press the chord box below to hear it, then play it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x x 10 12 13 12 | x x 1 2 4 3"] }, after: [
      "After the D shape the C shape comes round again, twelve frets above the open one.",
      "Now play all five in a row, from the open C chord up to the D shape, and say each shape's letter as you land on it: C, A, G, E, D. Then come back down.",
      "Practice until you can go up and back down without stopping to look for the next shape.",
    ] },

    { type: "h2", text: "The relative minor chord" },
    { type: "p", text: "Every major key has a relative minor: a minor key with exactly the same notes. C major is C, D, E, F, G, A and B. A minor is A, B, C, D, E, F and G. Same seven notes, a different home note." },
    { type: "guide", slug: "major-and-minor-chords", text: "Not sure what makes a chord minor? This guide shows the one note that changes, and how to hear it." },
    { type: "p", text: "So the Am chord, the relative minor of the C chord, lives in the same frets as the C chord, all the way up the neck. Its root, the note A, is three frets below the note C on the same string. And its shape is always the next letter of CAGED: where the C chord is in the C shape, the Am chord is in the A shape." },

    { type: "exercise", title: "5. The C and Am chords in the same frets", lines: [
      "Here is the neck map of the C chord again. Tap a few dots to hear them.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", islands: true },
    between: [
      "And here is the neck map of the Am chord. Look at the colours: each Am shape sits where a C shape sits, and the shapes follow the same CAGED order, starting one letter on: A, G, E, D, C.",
    ],
    beside: { type: "caged-neck", key: "a", scale: "natural-minor-aeolian", islands: true }, parts: [
      { title: "The open C and Am chords", lines: [
        "Press each chord box below to hear the C chord, then the Am chord. Then play C, Am, C on your guitar.",
        "From the C chord to the Am chord two fingers stay where they are, and only finger 3 moves.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"] } },
      { title: "The C and Am chords up the neck", lines: [
        "Up the neck it works the same way. Here is the C chord in the E shape and the Am chord in the D shape, in almost the same frets. Pluck only the strings your fingers press.",
        "Press each chord box below to hear it, then play the C chord, the Am chord and the C chord again on your guitar.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"], frets: ["x 10 10 9 x x | x 2 3 1 x x", "x x 7 9 10 8 | x x 1 3 4 2"] } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Take the G chord through its five shapes. The order is the same, but it starts on the G shape: G, E, D, C, A. The [CAGED explorer](/theory/caged) shows any chord, with the arpeggio and scale around each shape.",
      "Pick one shape of the C chord and play it, then the Am chord in the same frets, until the change is easy. Then try the next shape up.",
      "Strum a slow C, Am, C, Am in one place on the neck, then move the same change to the next shape up.",
    ] },
    { type: "p", text: "Before long, any chord you know will have five places on the neck, and its relative minor right beside each one." },
    { type: "p", text: "To see the scale around these shapes, try [Major and minor scales side by side on the guitar neck](/learn/major-and-minor-scales-guitar). For more chords without a barre, see [Barre chord alternatives](/learn/barre-chord-alternatives)." },
  ],
};
