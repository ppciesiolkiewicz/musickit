import type { Article } from "../model";

export const movableChordShapes: Article = {
  slug: "movable-chord-shapes",
  title: "Movable chord shapes on guitar",
  metaTitle: "Movable Chord Shapes on Guitar: One Shape, Many Chords · attunr",
  description: "Learn one chord shape and slide it along the neck for new chords: what makes a shape movable, why open strings get in the way, and how to find the fret.",
  intro: "Movable shapes are guitar chords you can slide along the neck without changing your finger positions. Here's how they work, with chords to play right on the page.",
  updated: "2026-11-27",
  sings: false,
  topics: ["guitar"],
  blocks: [
    { type: "p", text: "Once you know a chord shape, you know more chords than you think. Slide it up the neck and the same fingers play a new chord. That's a movable shape, and it saves you learning every chord from scratch." },
    { type: "p", text: "Here's the simplest one: this small F has no open strings. Keep your fingers as they are and slide your hand two frets up, and it's G. Press the Play button under each chord box below to hear both." },
    { type: "row", tools: [{ type: "chord-shapes", chords: ["F", "G"], frets: ["x x 3 2 1 x", "x x 5 4 3 x"] }] },
    { type: "p", text: "The [easy alternatives to barre chords](/learn/barre-chord-alternatives) lean on them all the time. Here's the idea on its own, so you can move any shape you know." },

    { type: "h2", text: "What makes a shape movable" },
    { type: "p", text: "A shape is movable when it has no open strings: every string you strum is pressed by a finger. Slide your hand and all its notes move together, so a major chord stays major, a minor chord stays minor, and only the letter changes." },
    { type: "p", text: "An open string doesn't move with your hand. The open B string plays the same note wherever your fingers are, so after a slide it no longer fits the chord. Up the neck, a finger has to press it instead." },

    { type: "h2", text: "Frets and steps" },
    { type: "p", text: "Slide a shape up one fret and every note in it moves to the next note, so the chord's name moves on with your hand. Slide F up one fret and it's F♯; two frets and it's G." },
    { type: "p", text: "Most chords have a sharp one between them, like F♯ between F and G. Two pairs don't: one fret above Bm is Cm, and one fret above Em is Fm." },
    { type: "p", text: "One fret is called a half step, and two frets a whole step. Down works the same way: two frets down, G becomes F again." },

    { type: "h2", text: "Find the fret for your chord" },
    { type: "p", text: "A shape with its root on the low E string or the A string is the easiest to place: find the chord's name on that string and put the shape's root on that fret." },
    { type: "list", items: [
      "**On the low E string:** F at fret 1, F♯ at 2, G at 3, A at 5, B at 7, C at 8.",
      "**On the A string:** B at fret 2, C at 3, C♯ at 4, D at 5, E at 7, G at 10.",
    ] },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first — [tuner](/tuner).",
      "Press the Play button under a chord box to hear it strummed.",
    ] },

    { type: "exercise", title: "1. Two frets up", lines: [
      "Plain F is F on the D, G and B strings, every note pressed, so it moves as it is.",
      "Press the Play button under each chord box below: F, then G two frets up, then A two frets more.",
    ], tool: { type: "chord-shapes", chords: ["F", "G", "A"], frets: ["x x 3 2 1 x", "x x 5 4 3 x", "x x 7 6 5 x"] }, after: [
      "When you slide two frets, the chord keeps its sound and goes up a whole step.",
      "Keep your fingers in their shape as you slide, easing off the strings a little on the way.",
    ] },

    { type: "exercise", title: "2. One fret at a time", lines: [
      "This minor shape is the open Am shape moved up, on the top four strings. A finger on each string, no open strings, no barre.",
      "Press the Play button under each chord box below: Bm, then Cm one fret up, then C♯m one fret more.",
    ], tool: { type: "chord-shapes", chords: ["Bm", "Cm", "C♯m"], frets: ["x x 4 4 3 2", "x x 5 5 4 3", "x x 6 6 5 4"] }, after: [
      "When you slide one fret, the chord goes up a half step, the smallest step there is.",
      "If a string buzzes after the slide, press it a little closer to the fret.",
    ] },

    { type: "exercise", title: "3. When an open string has to move", lines: [
      "B7 has the open B string in it. Slide your hand up one fret and that string stays where it was, so it no longer fits the chord.",
      "For C7 a finger presses it instead, at the 1st fret. Your fingers change places, and C7 leaves out the high e string, so stop your strum before it.",
      "Press the Play button under B7 below, then under C7.",
    ], tool: { type: "chord-shapes", chords: ["B7", "C7"], frets: [null, "x 3 2 3 1 x"] }, after: [
      "Look at the two chord boxes: the notes on the A, D and G strings moved up one fret, and the open B string became a pressed one.",
    ], parts: [
      { title: "Now it moves as it is", lines: [
        "C7 here is the open C7 shape with the high e left out, so it has no open strings. Its root is C on the A string, at the 3rd fret.",
        "Slide it up two frets to D on the A string for D7, then two more to E for E7.",
        "Press the Play button under each chord box below.",
      ], tool: { type: "chord-shapes", chords: ["C7", "D7", "E7"], frets: ["x 3 2 3 1 x", "x 5 4 5 3 x", "x 7 6 7 5 x"] } },
    ] },

    { type: "exercise", title: "4. A finger for the open D string", lines: [
      "The open D and Dm shapes ring the open D string as their root. Up the neck, your first finger presses it.",
      "Two frets up, D becomes E and Dm becomes Em; two more and they're F♯ and F♯m.",
      "Press the Play button under each chord box below.",
    ], tool: { type: "chord-shapes", chords: ["D", "E", "F♯", "Dm", "Em", "F♯m"], frets: ["x x 0 2 3 2", "x x 2 4 5 4", "x x 4 6 7 6", "x x 0 2 3 1", "x x 2 4 5 3", "x x 4 6 7 5"] }, after: [
      "Once your first finger takes the D string, the shape has no open strings left, so from there it moves as it is.",
    ] },

    { type: "exercise", title: "5. Root on the A string", lines: [
      "The 9 chord has its root on the A string: C at the 3rd fret gives C9.",
      "For D9, find D on the A string at the 5th fret and slide the shape there. E is at the 7th fret, so that's E9.",
      "Press the Play button under each chord box below.",
    ], tool: { type: "chord-shapes", chords: ["C9", "D9", "E9"], frets: ["x 3 2 3 3 x", "x 5 4 5 5 x", "x 7 6 7 7 x"] }, after: [
      "The goal is to put your second finger straight on the root, wherever the chord is.",
    ] },

    { type: "exercise", title: "6. Root on the low E string", lines: [
      "This maj7 shape has its root on the low E string, under your first finger. F at the 1st fret gives Fmaj7.",
      "G is at the 3rd fret and A at the 5th, so slide it there for Gmaj7 and Amaj7. Your first finger touches the A string lightly to keep it quiet.",
      "I liked learning jazz shapes like this one. Jazz has a name for being hard, but its shapes were much easier on my hand than a barre.",
      "Press the Play button under each chord box below.",
    ], tool: { type: "chord-shapes", chords: ["Fmaj7", "Gmaj7", "Amaj7"], frets: ["1 x 2 2 1 x | 1 x 3 4 2 x", "3 x 4 4 3 x | 1 x 3 4 2 x", "5 x 6 6 5 x | 1 x 3 4 2 x"] }, after: [
      "The goal is to land your first finger on the root and let the other three follow.",
    ] },

    { type: "exercise", title: "7. Bonus: C6 and Cmaj7", lines: [
      "Two more jazz shapes, both movable. They're harder than the ones above, Cmaj7 most of all.",
      "C6 is C with the 6th, A, added. Its root is on the low E string at the 8th fret, under your second finger, and it skips the A string like the maj7 shape: that finger touches the A string lightly to keep it quiet.",
      "This Cmaj7 has its root on the A string at the 3rd fret, under your first finger. The other three fingers reach two frets further up, and that stretch is the hard part.",
      "Press the Play button under each chord box below.",
    ], tool: { type: "chord-shapes", chords: ["C6", "Cmaj7"], frets: ["8 x 7 9 8 x | 2 x 1 4 3 x", "x 3 5 4 5 x | x 1 3 2 4 x"] }, parts: [
      { title: "C6 at G and A", lines: [
        "Slide C6 down to G on the low E string, at the 3rd fret, for G6. Two frets up, at A, it's A6.",
        "Press the Play button under each chord box below.",
      ], tool: { type: "chord-shapes", chords: ["G6", "A6"], frets: ["3 x 2 4 3 x | 2 x 1 4 3 x", "5 x 4 6 5 x | 2 x 1 4 3 x"] } },
      { title: "A smaller stretch", lines: [
        "Slide Cmaj7 up two frets for Dmaj7, and two more for Emaj7. The frets get closer together as you go up, so the stretch gets smaller.",
        "If Cmaj7 is too wide for your hand, start with Emaj7 and work your way down.",
      ], tool: { type: "chord-shapes", chords: ["Cmaj7", "Dmaj7", "Emaj7"], frets: ["x 3 5 4 5 x | x 1 3 2 4 x", "x 5 7 6 7 x | x 1 3 2 4 x", "x 7 9 8 9 x | x 1 3 2 4 x"] } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Find G on the A string, at the 10th fret, and play the 9 chord there for G9.",
      "Slide the maj7 shape up to C on the low E string, at the 8th fret, for Cmaj7.",
      "A blues in C uses C, F and G. Play all three as 9 chords: C9 at the 3rd fret, F9 at the 8th and G9 at the 10th, all on the A string.",
      "Pick an open chord you know and look for its open strings. Give each one a finger, then slide the shape up and see if it still fits your hand.",
    ] },
    { type: "p", text: "You'll notice finding the root on the low E and A strings getting quicker first. Then a shape you know turns into the chord you need, wherever the song is, and that's half of every barre chord already." },
    { type: "p", text: "Next: [the CAGED system](/learn/caged-system-guitar), five movable shapes of one chord that join up the whole neck." },
  ],
};
