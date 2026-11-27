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
    { type: "p", text: "Take the shape of an open chord, slide it up and press the open strings with a finger, and you get the same chord higher up. Do it with all five and they join end to end along the neck, always in the same order: C, A, G, E, D. That order is where the name CAGED comes from." },
    { type: "p", text: "Each shape you slide up this way is a movable shape: with no open strings left, your hand carries the whole chord to any fret. CAGED is five movable shapes for one chord, joined end to end." },
    { type: "guide", slug: "movable-chord-shapes", text: "Never slid a chord shape up the neck? This guide starts with one shape and two chords." },
    { type: "p", text: "In this guide you'll play the C chord in all five shapes, then find the Am chord hiding in the same frets." },

    { type: "h2", text: "How to read the diagrams" },
    { type: "list", items: [
      "Each shape is a chord box: the neck stands upright, the low E string on the left, and the number beside it is the fret the box starts at.",
      "The neck map lies flat, with the low E string at the bottom, as you see it looking down at your guitar.",
      "Each dot is labelled by how far it is from C, the root of the C chord. R is the root, 3 the 3rd and p5 the 5th (p is for perfect): the three notes of a major chord.",
      "Press Play under a chord box to hear it. On the neck map, tap any dot to hear it.",
    ] },
    { type: "p", text: "Use the Labels selector at the bottom of this page to switch every dot between intervals and solfège." },
    { type: "guide", slug: "intervals-and-solfege", text: "New to intervals? This guide names every note from Do, on a piano and on the guitar neck." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Some shapes up the neck are barre chords. If a full shape won't ring yet, play only the top three or four strings.",
    ] },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "exercise", title: "1. The five open chords", lines: [
      "These are the five shapes CAGED is named after. Press each chord box below to hear it, then play it on your guitar.",
      "Practice until you can play each one without looking up the fingering.",
    ], tool: { type: "chord-shapes", chords: ["C", "A", "G", "E", "D"] } },

    { type: "exercise", title: "2. The C chord in the C and A shapes", key: "c", lines: [
      "Here is the C chord in the C shape: the open C chord you just played. Press the chord box below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x 3 2 0 1 0 | x 3 2 0 1 0"] },
    between: [
      "And here is the C chord again, in the A shape: the open A chord moved up three frets, with finger 1 pressing across fret 3 where the open strings were. Press the chord box below to hear it.",
    ],
    beside: { type: "chord-shapes", chords: ["C"], frets: ["x 3 5 5 5 3 | x 1 2 3 4 1"] }, after: [
      "Look at the {{1}} on the A string in both: it's the same note, at fret 3. That shared root is where one shape hands over to the next.",
      "Practice until you can move from one shape to the other without stopping.",
    ] },

    { type: "exercise", title: "3. The C chord in the G and E shapes", key: "c", lines: [
      "Next up the neck is the G shape. The full shape is a big stretch, so here are its top three strings: still the C chord. Press the chord box below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x x x 5 5 8 | x x x 1 1 4"] },
    between: [
      "Then comes the E shape: the barre chord most of us learn first, here at fret 8. Press the chord box below to hear it.",
    ],
    beside: { type: "chord-shapes", chords: ["C"], frets: ["8 10 10 9 8 8 | 1 3 4 2 1 1"] }, after: [
      "Play one, then the other, on your guitar.",
      "Practice until each shape rings clearly, string by string.",
    ] },

    { type: "exercise", title: "4. The C chord in the D shape", key: "c", lines: [
      "The last shape is the D shape, with its root on the D string at fret 10: the same {{1}} the E shape has on that string. Press the chord box below to hear it, then play it.",
    ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x x 10 12 13 12 | x x 1 2 4 3"] }, after: [
      "After the D shape the C shape comes round again, twelve frets above the open one.",
    ] },

    { type: "exercise", title: "5. All five shapes up the neck", lines: [
      "The neck map below shows every note of the C chord from the nut up, each shape in its own colour.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian" }, after: [
      "Play the C chord in each shape, from the open C chord up to the D shape, and say the shape's letter as you land on it: C, A, G, E, D. Then come back down.",
      "If you lose your place, find the next {{1}} up the neck: it belongs to the shape you're in and the next one.",
      "Practice until you can go up and back down without stopping to look for the next shape.",
    ] },

    { type: "h2", text: "The relative minor chord" },
    { type: "p", text: "Every major key has a relative minor: a minor key with exactly the same notes. C major is C, D, E, F, G, A and B. A minor is A, B, C, D, E, F and G. Same seven notes, a different home note." },
    { type: "guide", slug: "major-and-minor-chords", text: "Not sure what makes a chord minor? This guide shows the one note that changes, and how to hear it." },
    { type: "p", text: "So the Am chord, the relative minor of the C chord, lives in the same frets as the C chord, all the way up the neck. Its root, the note A, is three frets below the note C on the same string. And its shape is always the next letter of CAGED: where the C chord is in the C shape, the Am chord is in the A shape." },

    { type: "exercise", title: "6. The C and Am chords in the same frets", lines: [
      "Here is the neck map of the C chord again. Tap a few dots to hear them.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian" },
    between: [
      "And here is the neck map of the Am chord. Look at the colours: each Am shape sits where a C shape sits, and the shapes follow the same CAGED order, starting one letter on: A, G, E, D, C.",
    ],
    beside: { type: "caged-neck", key: "a", scale: "natural-minor-aeolian" }, parts: [
      { title: "The open C and Am chords", lines: [
        "Press each chord box below to hear the C chord, then the Am chord. Then play C, Am, C on your guitar.",
        "From the C chord to the Am chord two fingers stay where they are, and only finger 3 moves.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"] } },
      { title: "The C and Am chords at fret 8", lines: [
        "Up the neck it works the same way. Here is the C chord in the E shape and the Am chord in the D shape, in almost the same frets.",
        "Press each chord box below to hear it, then play C, Am, C on your guitar.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"], frets: ["8 10 10 9 8 8 | 1 3 4 2 1 1", "x x 7 9 10 8 | x x 1 2 4 3"] } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Take the G chord through its five shapes. The order is the same, but it starts on the G shape: G, E, D, C, A. The [CAGED explorer](/theory/caged) shows any chord, with the arpeggio and scale around each shape.",
      "Pick one shape of the C chord and play it, then the Am chord in the same frets, until the change is easy. Then try the next shape up.",
      "Strum a slow C, Am, C, Am in one place on the neck, then move the same change to the next shape up.",
    ] },
    { type: "p", text: "Before long, any chord you know will have five places on the neck, and its relative minor right beside each one." },
    { type: "p", text: "To see the scale around these shapes, try [Major and minor scales side by side on the guitar neck](/learn/major-and-minor-scales-guitar). For easier versions of the barre shapes, see [Barre chord alternatives](/learn/barre-chord-alternatives)." },
  ],
};
