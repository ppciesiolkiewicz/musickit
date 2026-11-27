import type { Article } from "../model";

export const cagedSystemGuitar: Article = {
  slug: "caged-system-guitar",
  title: "The CAGED system on guitar: one chord, five shapes",
  metaTitle: "CAGED System for Beginners: A Visual, Interactive Guide · attunr",
  description: "Learn the CAGED system on an interactive guitar neck: play C in five shapes up the neck, hear each one, and find its relative minor chord in the same frets.",
  intro: "A visual, interactive guide to the CAGED system: one chord played in five shapes, from the open position to fret 12, and the minor chord that sits in the same frets.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar", "theory"],
  blocks: [
    { type: "p", text: "You probably know the open chords C, A, G, E and D. Here's the surprise: those five shapes are all you need to play any chord anywhere on the neck." },
    { type: "p", text: "Take the shape of an open chord, slide it up and press the open strings with a finger, and you get the same chord higher up. Do it with all five and they join end to end along the neck, always in the same order: C, A, G, E, D. That order is where the name CAGED comes from." },
    { type: "p", text: "Each shape you slide up this way is a movable shape: with no open strings left, your hand carries the whole chord to any fret. CAGED is five movable shapes for one chord, joined end to end." },
    { type: "guide", slug: "movable-chord-shapes", text: "Never slid a chord shape up the neck? This guide starts with one shape and two chords." },
    { type: "p", text: "In this guide you'll play C in all five shapes, then find A minor hiding in the same frets." },

    { type: "h2", text: "How to read the necks" },
    { type: "list", items: [
      "The neck of a single shape stands upright, like a chord box: the low E string on the left, fret numbers going down. The whole neck lies flat, with the low E string at the bottom, as you see it looking down at your guitar.",
      "Each dot is labelled by how far it is from C, the root. R is the root, 3 the 3rd and p5 the 5th (p is for perfect): the three notes of a major chord.",
      "Tap any dot to hear it. Press Play above a neck to hear what it shows.",
      "Each shape shows four necks: the chord, its arpeggio, the pentatonic scale and the full scale, all in the same frets. This guide is about the chord. The other three are there to explore.",
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

    { type: "exercise", title: "2. C in the C and A shapes", lines: [
      "Below is C in the C shape: the open C chord you just played. Under it is C in the A shape: the open A chord moved up three frets, with finger 1 pressing where the open strings were.",
      "Press Play on the CAGED / Chord neck of each shape to hear it, then play both on your guitar.",
      "Look at the {{1}} on the A string: both shapes share it. That shared root is where one shape hands over to the next.",
    ], after: [
      "Practice until you can move from one shape to the other without stopping.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", shapes: ["C", "A"] } },

    { type: "exercise", title: "3. C in the G and E shapes", lines: [
      "Next up the neck come the G shape and the E shape. The E shape is the barre chord most of us learn first.",
      "Press Play on the CAGED / Chord neck of each shape to hear it, then play both on your guitar.",
      "The G shape is a big stretch. Play only its top three strings first: the chord box under the necks shows them.",
    ], after: [
      "Practice until each shape rings clearly, string by string.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", shapes: ["G", "E"] }, parts: [
      { title: "The G shape, made smaller", lines: [
        "Press the chord box below to hear the top three strings of the G shape: still a C chord. Then play it on your guitar.",
      ], tool: { type: "chord-shapes", chords: ["C"], frets: ["x x x 5 5 8"] } },
    ] },

    { type: "exercise", title: "4. C in the D shape", lines: [
      "The last shape is the D shape, with its root on the D string. It shares that {{1}} with the E shape just below it.",
      "Press Play on the CAGED / Chord neck to hear it, then play it on your guitar.",
      "After the D shape the C shape comes round again, twelve frets above the open one.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", shapes: ["D"] } },

    { type: "exercise", title: "5. All five shapes up the neck", lines: [
      "The neck below shows every note of the C chord from the nut up, each shape in its own colour.",
      "Play C in each shape, from the open C up to the D shape, and say its letter as you land on it: C, A, G, E, D. Then come back down.",
      "If you lose your place, find the next {{1}} up the neck: it belongs to the shape you're in and the next one.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian" }, after: [
      "Practice until you can go up and back down without stopping to look for the next shape.",
    ] },

    { type: "h2", text: "The relative minor chord" },
    { type: "p", text: "Every major key has a relative minor: a minor key with exactly the same notes. C major is C, D, E, F, G, A and B. A minor is A, B, C, D, E, F and G. Same seven notes, a different home note." },
    { type: "guide", slug: "major-and-minor-chords", text: "Not sure what makes a chord minor? This guide shows the one note that changes, and how to hear it." },
    { type: "p", text: "So Am, the relative minor chord of C, lives in the same frets as C, all the way up the neck. Its root, A, is three frets below C on the same string. And its shape is always the next letter of CAGED: where C is in the C shape, Am is in the A shape." },

    { type: "exercise", title: "6. C and Am in the same frets", lines: [
      "Here is every note of the C chord up the neck again, and A minor under it. Look at the colours: each Am shape sits where a C shape sits.",
      "Tap a few dots on each neck to hear them.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian" },
    between: [
      "In A minor, the shapes follow the same CAGED order, starting one letter on: A, G, E, D, C.",
    ],
    beside: { type: "caged-neck", key: "a", scale: "natural-minor-aeolian" }, parts: [
      { title: "Open C and Am", lines: [
        "Press each chord box below to hear C, then Am. Then play C, Am, C on your guitar.",
        "From C to Am two fingers stay where they are, and only finger 3 moves.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"] } },
      { title: "C and Am at fret 8", lines: [
        "Up the neck it works the same way. Here is C in the E shape and Am in the D shape, in almost the same frets.",
        "Press each chord box below to hear it, then play C, Am, C on your guitar.",
      ], tool: { type: "chord-shapes", chords: ["C", "Am"], frets: ["8 10 10 9 8 8", "x x 7 9 10 8"] } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Take G through its five shapes. The order is the same, but it starts on G: G, E, D, C, A. The [CAGED explorer](/theory/caged) shows any key.",
      "Pick one C shape and play C, then Am in the same frets, until the change is easy. Then try the next shape up.",
      "Strum a slow C, Am, C, Am in one shape, then move the same change to the next shape up.",
    ] },
    { type: "p", text: "Before long, any chord you know will have five places on the neck, and its relative minor right beside each one." },
    { type: "p", text: "To see the scale around these shapes, try [Major and minor scales side by side on the guitar neck](/learn/major-and-minor-scales-guitar). For easier versions of the barre shapes, see [Barre chord alternatives](/learn/barre-chord-alternatives)." },
  ],
};
