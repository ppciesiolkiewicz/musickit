import type { Article } from "../model";

export const cagedSystemGuitar: Article = {
  slug: "caged-system-guitar",
  title: "The CAGED system on guitar: one chord, five shapes",
  metaTitle: "CAGED System for Beginners: A Visual, Interactive Guide · attunr",
  description: "Learn the CAGED system on an interactive guitar neck: play any major or minor chord in five shapes, from the open chords to the barre chords.",
  intro: "A visual, interactive guide to the CAGED system: the open chords you know, moved up the neck to play one chord in five places. Major chords first, then minor.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar", "theory"],
  blocks: [
    { type: "p", text: "You probably know the open chords C, A, G, E and D. Here's the surprise: those five shapes are all you need to play any chord anywhere on the neck." },
    { type: "p", text: "Here's the trick: take an open chord and play only the strings your fingers press. Slide those fingers up the neck together and you get the same chord higher up. Do it with all five shapes and they join end to end along the neck, always in the same order: C, A, G, E, D. That order is where the name CAGED comes from." },
    { type: "guide", slug: "movable-chord-shapes", text: "Never slid a chord shape up the neck? This guide starts with one shape and two chords." },
    { type: "p", text: "In this guide you'll do it with the major chords first, then the same four steps with the minor chords." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Pluck only the strings your fingers press, one at a time or together. You won't need a barre until the last step of each part.",
    ] },
    { type: "care", text: "_Rest your hand when your thumb or wrist starts to ache._" },

    { type: "h2", text: "Major chords" },

    { type: "exercise", title: "1. The five open chords", lines: [
      "These are the five shapes CAGED is named after. Press each chord box below to hear it, then play it on your guitar.",
    ], tool: { type: "chord-shapes", chords: ["C", "A", "G", "E", "D"], frets: [null, null, "3 2 0 0 3 3 | 2 1 0 0 3 4", null, null] }, after: [
      "Now play each one again, plucking only the strings your fingers press. Those notes are the shape you'll move up the neck.",
      "In the C chord the open G string sits between the strings you press, so skip it when you pluck, or let the finger on the D string lean on it to mute it.",
      "The G chord is the trickiest: its open strings are the middle ones, so your fingers press only the outer strings. Play it with finger 3 on the B string, as the chord box shows. That note is the 5th, and the G shape keeps it when it moves up.",
      "Practice until you can play each one without looking up the fingering.",
    ] },

    { type: "exercise", title: "2. The open chord shapes on the neck", lines: [
      "Here are those five shapes on the whole neck, each moved up to play the C chord. Each frame rings the notes one open chord's fingers press, in that shape's colour. The chord's other notes are faded. Tap any dot to hear it.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", islands: "only" }, after: [
      "Read the frames from the nut up: the open C chord, then the A, G, E and D shapes. After the D shape the C shape comes round again at fret 12.",
      "Practice until you can point at any frame and name the open chord it comes from.",
    ] },

    { type: "exercise", title: "3. One chord in five shapes", lines: [
      "Here are the same five frames as chord boxes, from the nut up. Press each chord box below to hear it, then play it.",
      "Once the C chord feels easy, try another chord. Use the Chord selector below to change the chord, then press each chord box to hear it there.",
    ], chain: { chords: ["C", "E", "G", "A"] }, after: [
      "Play all five in a row and say each shape's letter as you land on it, then come back down.",
      "When you change the chord, the shapes keep the same order, but the row starts on a new shape: the E chord starts on the E shape, the G chord on the G shape.",
      "Practice until you can go up and back down without stopping to look for the next shape.",
    ] },

    { type: "exercise", title: "4. The whole chord: barre chords", lines: [
      "Each frame in step 2 is only part of the chord. The neck map below rings every note of each shape's whole chord, in that shape's colour.",
      "You can see how the shapes join: each one shares notes with the shape next to it, like the D and C shapes, or the C, A and G shapes. A note two shapes share is ringed twice.",
    ], tool: { type: "caged-neck", key: "c", scale: "major-ionian", islands: true },
    between: [
      "Fill in the rest of each shape and you get the whole open chord, moved up, with a barre where the nut was. Press each chord box below to hear it, then play it.",
      "Some of these chords are really hard to play, which is why the steps above kept to the notes your fingers press.",
    ],
    chain: { chords: ["C", "E", "G", "A"], barre: true }, after: [
      "The A and E shapes are the barre chords you'll use most. The G and D shapes need a long stretch, so play the part of them that's comfortable.",
      "Practice until each string rings clearly, then use the Chord selector to move to another chord.",
    ] },

    { type: "h2", text: "Minor chords" },
    { type: "p", text: "Minor chords work the same way: the open minor chords, the notes your fingers press, slid up the neck in the same CAGED order." },
    { type: "guide", slug: "major-and-minor-chords", text: "Not sure what makes a chord minor? This guide shows the one note that changes, and how to hear it." },
    { type: "p", text: "The Am chord is a good place to start. It's the C chord's relative minor: A minor has the same seven notes as C major. So its five shapes sit in the same frets as the C chord's, each one CAGED letter on: where the C chord is in the C shape, the Am chord is in the A shape." },

    { type: "exercise", title: "5. The five open minor chords", lines: [
      "Here are the five minor shapes as open chords. You'll know the Am, Em and Dm chords. The Cm and Gm chords are rarely played open, but their shapes move up the neck like the others. Press each chord box below to hear it, then play it.",
    ], tool: { type: "chord-shapes", chords: ["Cm", "Am", "Gm", "Em", "Dm"], frets: ["x 3 1 0 1 x | x 3 1 0 2 x", "x 0 2 2 1 0", "3 1 0 0 3 3 | 2 1 0 0 3 4", "0 2 2 0 0 0", "x x 0 2 3 1"] }, after: [
      "In the Em chord your fingers press only the root and the 5th. Its minor 3rd is the open G string, so the Em shape keeps the G string when it moves up, under finger 1.",
      "Practice until you can play each one without looking up the fingering.",
    ] },

    { type: "exercise", title: "6. The open minor shapes on the neck", lines: [
      "Here are the minor shapes on the whole neck, each moved to play the Am chord. The order is the same, starting from the open Am chord: A, G, E, D, C. The chord's other notes are faded. Tap any dot to hear it.",
    ], tool: { type: "caged-neck", key: "a", scale: "natural-minor-aeolian", islands: "only" }, after: [
      "Compare it with the C chord's neck map in step 2: each frame sits in the same frets, one letter on.",
      "Practice until you can point at any frame and name the open chord it comes from.",
    ] },

    { type: "exercise", title: "7. One minor chord in five shapes", lines: [
      "Here are the Am chord's five frames as chord boxes, from the nut up. Press each chord box below to hear it, then play it.",
      "Once the Am chord feels easy, try another one. Use the Chord selector below to change the chord, then press each chord box to hear it there.",
    ], chain: { chords: ["Am", "Em", "Dm"] }, after: [
      "Play all five in a row and say each shape's letter as you land on it, then come back down.",
      "When you change the chord, the shapes keep the same order, but the row starts on a new shape: the Em chord starts on the E shape, the Dm chord on the D shape.",
      "Practice until you can go up and back down without stopping to look for the next shape.",
    ] },

    { type: "exercise", title: "8. The whole minor chord: barre chords", lines: [
      "The neck map below rings every note of each minor shape's whole chord. A note two shapes share is ringed twice.",
    ], tool: { type: "caged-neck", key: "a", scale: "natural-minor-aeolian", islands: true },
    between: [
      "Fill in each shape and you get the minor barre chords. Press each chord box below to hear it, then play it.",
    ],
    chain: { chords: ["Am", "Em", "Dm"], barre: true }, after: [
      "As with the major chords, the A and E shapes are the minor barre chords you'll use most.",
      "Practice until each string rings clearly, then use the Chord selector to move to another chord.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Pick one place on the neck and play the C chord, then the Am chord in the same frets, until the change is easy. Then try the next shape up.",
      "Strum a slow C, Am, C, Am in one place on the neck, then move the same change to the next shape up.",
      "Take a chord that isn't in the Chord selector, like the F chord, through its five shapes. The [CAGED explorer](/theory/caged) shows any chord, with the arpeggio and scale around each shape.",
    ] },
    { type: "p", text: "Before long, any chord you know will have five places on the neck, and its relative minor right beside each one." },
    { type: "p", text: "To see the scale around these shapes, try [Major and minor scales side by side on the guitar neck](/learn/major-and-minor-scales-guitar). For more chords without a barre, see [Barre chord alternatives](/learn/barre-chord-alternatives)." },
  ],
};
