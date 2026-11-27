import type { Article } from "../model";

export const barreChordAlternatives: Article = {
  slug: "barre-chord-alternatives",
  title: "Easy alternatives to barre chords",
  metaTitle: "Easy Barre Chord Alternatives for F, B and Minor Chords · attunr",
  description: "Can't play F or B yet? Fmaj7, B7, four-string minor chords, triads and two no-barre shapes, with audio for each.",
  intro: "Easier chords that do a barre chord's job while the barre comes along, to hear and play right on the page.",
  updated: "2026-11-26",
  sings: false,
  topics: ["guitar"],
  blocks: [
    { type: "p", text: "Barre chords are hard. Most of us take weeks before every string rings, and F is the chord that makes people put the guitar down. Good news: you don't have to wait for it to play the song." },
    { type: "p", text: "Every barre has an easier stand-in. Some add a note, which changes the feel, so they won't suit every song. Others are the barre with strings left out, and fit anywhere. Here are the ones I'd reach for, easiest first." },

    { type: "h2", text: "Look up your chord" },
    { type: "p", text: "Type the barre chord your song asks for, and you'll see its easier chords. The exercises below show how each one works." },
    { type: "chord-finder" },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Press Play under a chord box to hear it strummed.",
    ] },

    { type: "exercise", title: "1. Fmaj7 for F", lines: [
      "Fmaj7 is F with one more note: E, the 7th, on the open high e string. No barre, and it sounds softer and dreamier than F.",
      "That softness is the catch. In a gentle song Fmaj7 often sounds better than F; in a bright, hard one it can sound too sweet. Try it in the song before you keep it.",
      "Press Play under F below, then under Fmaj7, and listen for the open e ringing on top.",
    ], tool: { type: "chord-shapes", chords: ["F", "Fmaj7"], frets: ["1 3 3 2 1 1", "x x 3 2 1 0"] }, between: [
      "Try playing it in a song. Press Play below to start the metronome, and strum each chord for a bar.",
    ], beside: { type: "strum-along", chords: ["C", "G", "Am", "Fmaj7"], bpm: 60 }, parts: [
      { title: "Plain F", lines: [
        "Leave out the high e string and Fmaj7 becomes F: only {{1}}, {{3}} and {{5}} are left.",
        "Press Play under each chord box below and listen for the {{7}} dropping out.",
      ], tool: { type: "chord-shapes", chords: ["Fmaj7", "F"], frets: ["x x 3 2 1 0", "x x 3 2 1 x"] } },
      { title: "Movable shapes", lines: [
        "Plain F has no open strings, so it's a movable shape: slide it up two frets for G, and two more for A.",
      ], tool: { type: "chord-shapes", chords: ["F", "G", "A"], frets: ["x x 3 2 1 x", "x x 5 4 3 x", "x x 7 6 5 x"] } },
    ] },

    { type: "exercise", title: "2. B7 for B", lines: [
      "B7 adds one note to B: A, the ♭7. That note pulls hard towards E.",
      "So B7 works where B goes to E or Em, and sounds bluesy anywhere else.",
      "Press Play under B below, then under B7.",
    ], tool: { type: "chord-shapes", chords: ["B", "B7"], frets: ["x 2 4 4 4 2", null] }, between: [
      "Press Play below and listen for the pull from B7 back to Em.",
    ], beside: { type: "strum-along", chords: ["Em", "Am", "B7", "Em"], bpm: 60 }, parts: [
      { title: "B7 up to C7", lines: [
        "Slide B7 up one fret and it's C7, with one catch: the open B string was doing work, and it doesn't move with your hand. On C7 that note has to be pressed, so your fingers change places.",
        "C7 leaves out the high e string, so stop your strum before it.",
        "Press Play under each chord box below to hear B7, then C7, and compare where the fingers sit.",
      ], tool: { type: "chord-shapes", chords: ["B7", "C7"], frets: [null, "x 3 2 3 1 x"] } },
      { title: "Movable shapes", lines: [
        "This C7 has no open strings, so from here it moves as it is: two frets up for D7, and two more for E7.",
        "Press Play under each chord box below to hear them.",
      ], tool: { type: "chord-shapes", chords: ["C7", "D7", "E7"], frets: ["x 3 2 3 1 x", "x 5 4 5 3 x", "x 7 6 7 5 x"] } },
    ] },

    { type: "exercise", title: "3. Minor barres on four strings", lines: [
      "For a minor barre with its root on the A string, like Bm, play the open Am shape moved up and leave out the two low strings. No barre at all: each finger has its own string.",
      "Nothing is added: the four strings hold {{5}}, {{1}}, {{b3}} and {{5}} again. Only the low root is gone, so it fits almost anywhere the barre does.",
      "Press Play under the first Bm below for the full barre, then under the second for the four-string one.",
    ], tool: { type: "chord-shapes", chords: ["Bm", "Bm"], frets: ["x 2 4 4 3 2", "x x 4 4 3 2"] }, after: [
      "If the low strings ring, start each strum on the D string.",
    ], parts: [
      { title: "Movable shapes", lines: [
        "This shape has no open strings, so it moves as it is. One fret up it's Cm, two frets up C♯m.",
      ], tool: { type: "chord-shapes", chords: ["Bm", "Cm", "C♯m"], frets: ["x x 4 4 3 2", "x x 5 5 4 3", "x x 6 6 5 4"] } },
    ] },

    { type: "exercise", title: "4. A fill between strums", lines: [
      "The four-string shape leaves your hand free for a short fill between strums: a few single notes on the same four strings.",
      "Here it is on Cm, the four-string shape one fret up. Press Play below to hear Cm for two beats and a short fill before the next Cm, and watch the lit dots on the neck.",
    ], tool: { type: "guitar-play-along", view: "neck", bpm: 60, under: "none", shape: { shape: "riff", key: "c", scale: "Aeolian", notes: [
      { frets: [{ string: 4, fret: 5, beats: 2 }, { string: 3, fret: 5, beats: 2 }, { string: 2, fret: 4, beats: 2 }, { string: 1, fret: 3, beats: 2 }], beats: 2 },
      { string: 2, fret: 6, beats: 0.5 }, { string: 2, fret: 4, beats: 0.5 }, { string: 3, fret: 5, beats: 1 },
      { frets: [{ string: 4, fret: 5, beats: 2 }, { string: 3, fret: 5, beats: 2 }, { string: 2, fret: 4, beats: 2 }, { string: 1, fret: 3, beats: 2 }], beats: 2 },
      { string: 3, fret: 3, beats: 0.5 }, { string: 4, fret: 3, beats: 0.5 }, { string: 3, fret: 3, beats: 0.5 }, { string: 3, fret: 5, beats: 0.5 },
    ] } }, between: [
      "The fill uses four notes of the C minor pentatonic scale: {{b3}}, {{4}}, {{b7}} and {{1}}. Make up your own fill from the dots on the top four strings below.",
    ], beside: { type: "position-neck", scale: "minor-pentatonic", key: "c", positions: [4], enable: ["1", "b3", "4", "b7"] }, parts: [
      { title: "Add the bass", lines: [
        "Now give each chord a bass note first: pick the low C on the A string, then strum Cm on the next beat.",
        "Press Play below to hear the bass, the strum and the fill together.",
        "If the fill makes the next bass note late, play fewer notes: two are enough.",
      ], tool: { type: "guitar-play-along", view: "neck", bpm: 60, under: "none", shape: { shape: "riff", key: "c", scale: "Aeolian", notes: [
        { string: 5, fret: 3, beats: 1 }, { frets: [{ string: 4, fret: 5, beats: 1 }, { string: 3, fret: 5, beats: 1 }, { string: 2, fret: 4, beats: 1 }, { string: 1, fret: 3, beats: 1 }], beats: 1 },
        { string: 2, fret: 6, beats: 0.5 }, { string: 2, fret: 4, beats: 0.5 }, { string: 3, fret: 5, beats: 1 },
        { string: 5, fret: 3, beats: 1 }, { frets: [{ string: 4, fret: 5, beats: 1 }, { string: 3, fret: 5, beats: 1 }, { string: 2, fret: 4, beats: 1 }, { string: 1, fret: 3, beats: 1 }], beats: 1 },
        { string: 3, fret: 3, beats: 0.5 }, { string: 4, fret: 3, beats: 0.5 }, { string: 3, fret: 3, beats: 0.5 }, { string: 3, fret: 5, beats: 0.5 },
      ] } } },
    ] },

    { type: "exercise", title: "5. Triads for major barres", lines: [
      "Major barres have their own way out: play only the top three strings. That's a triad, the chord's three notes and nothing else.",
      "It's thinner than the barre, so it suits a quiet part, or a song where someone else plays the low notes.",
      "Press Play under each chord box below to hear F and B on the top three strings.",
    ], tool: { type: "chord-shapes", chords: ["F", "B"], frets: ["x x x 2 1 1", "x x x 4 4 2"] }, parts: [
      { title: "Movable shapes", lines: [
        "The open D and Dm shapes move too. Their open D string was doing work, so up the neck your first finger takes it. Two frets up, D becomes E and Dm becomes Em; two more and they're F♯ and F♯m.",
        "Press Play under each chord box below to hear them.",
      ], tool: { type: "chord-shapes", chords: ["D", "E", "F♯", "Dm", "Em", "F♯m"], frets: ["x x 0 2 3 2", "x x 2 4 5 4", "x x 4 6 7 6", "x x 0 2 3 1", "x x 2 4 5 3", "x x 4 6 7 5"] } },
      { title: "B♭, Fm and Gm", lines: [
        "Three more barre chords come up in a lot of songs: B♭, Fm and Gm. Each one is a shape from this exercise, moved.",
        "B♭ is the B triad on the top three strings, one fret down. Fm is the Dm shape three frets up, and Gm is two frets above that.",
        "Press Play under each chord box below to hear them.",
      ], tool: { type: "chord-shapes", chords: ["B♭", "Fm", "Gm"], frets: ["x x x 3 3 1", "x x 3 5 6 4", "x x 5 7 8 6"] } },
    ] },

    { type: "exercise", title: "6. The 9 chord", lines: [
      "The 9 chord has its root on the A string and needs no full barre. It adds the ♭7 and the 9th (the 2nd, an octave up): a funky, bluesy sound for a blues or a funk song.",
      "Press Play under C9 below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["C9"], frets: ["x 3 2 3 3 x"] }, parts: [
      { title: "Movable shapes", lines: [
        "No open strings here either. Slide it up two frets for D9, then two more for E9.",
      ], tool: { type: "chord-shapes", chords: ["C9", "D9", "E9"], frets: ["x 3 2 3 3 x", "x 5 4 5 5 x", "x 7 6 7 7 x"] } },
    ] },

    { type: "exercise", title: "7. The maj7 shape on the low E", lines: [
      "For a major chord with its root on the low E string, there's the maj7 shape: four fingers, one on each note, and no barre. Your first finger takes the low E and touches the A string lightly to keep it quiet.",
      "Fmaj7 here is the same soft F as in exercise 1, down on the low strings. Press Play under Fmaj7 below to hear it.",
    ], tool: { type: "chord-shapes", chords: ["Fmaj7"], frets: ["1 x 2 2 1 x | 1 x 3 4 2 x"] }, parts: [
      { title: "Movable shapes", lines: [
        "Slide it up two frets for Gmaj7, and two more for Amaj7.",
      ], tool: { type: "chord-shapes", chords: ["Fmaj7", "Gmaj7", "Amaj7"], frets: ["1 x 2 2 1 x | 1 x 3 4 2 x", "3 x 4 4 3 x | 1 x 3 4 2 x", "5 x 6 6 5 x | 1 x 3 4 2 x"] } },
    ] },

    { type: "h2", text: "Summary" },
    { type: "list", items: [
      "**F:** Fmaj7, softer, so try it in the song first. Leave out the high e and it's plain F.",
      "**B:** B7, where the song goes on to E or Em.",
      "**A minor barre:** the open Am shape moved up, on the top four strings, or the open Dm shape moved up (Fm, Gm).",
      "**A major barre:** a triad on the top three strings (B♭ is the B triad one fret down), or the open D shape moved up.",
      "**A blues or funk song:** the 9 chord.",
      "**Moving a shape:** with no open strings it moves as it is. With open strings, a finger has to take their place.",
    ] },
    { type: "p", text: "You'll notice the changes getting quicker first. The barre comes later, and by then your hand already knows half of it." },
  ],
};
