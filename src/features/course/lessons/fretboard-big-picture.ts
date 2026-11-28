import type { CourseArticle } from "../model";

/**
 * Course section `fretboard-big-picture`, written in the /learn articles' style: everything the neck holds in one look, and the
 * two ideas a player is expected to know. The video is a placeholder until Pio records it.
 */
export const fretboardBigPicture: CourseArticle = {
  updated: "2026-11-28T15:54",
  versions: { agents: 3, teaching: 16, voice: 7 },
  blocks: [
    { type: "p", text: "In [How this course works](/course/0/how-this-course-works) I said the neck holds a lot. Here's all of it on one page, so nothing later comes as a surprise." },
    { type: "p", text: "You don't have to learn any of it today. Read it the way you'd look at a map before a trip." },
    { type: "row", tools: [{ type: "video", ref: { source: "placeholder", text: "I walk through this page: the neck looks like a lot, and what you need to know is very little." } }] },

    { type: "h2", text: "What's on the neck" },
    { type: "p", text: "Each of these is a way of looking at the same few notes." },
    { type: "list", items: [
      "**Intervals.** An interval is how far one note is from another. Everything else on this list is built from them.",
      "**Scales.** A scale is the notes of a key in order. Melodies and solos come from it.",
      "**Chords.** A chord is a few notes of the scale played together.",
      "**Triads.** A triad is a chord at its smallest: three notes on three strings.",
      "**Arpeggios.** An arpeggio is a chord's notes played one at a time.",
      "**Double stops.** A double stop is two notes played together.",
      "**CAGED.** Five chord shapes that join up along the whole neck, so every chord has five places to be.",
    ] },

    { type: "h2", text: "What you need to know" },
    { type: "p", text: "Here's the good part: you don't learn those seven things one by one. Two small ideas carry nearly all of them." },
    { type: "p", text: "**The 1st, 4th and 5th.** Count up the scale from the home note and stop on the 1st, 4th and 5th notes. Most songs are built from the chords on those three notes, and on the neck the three sit close together, under one hand." },
    { type: "p", text: "**Shapes that move.** What you learn in one place on the neck, a chord, a scale or a path between notes, moves to another fret and works there too. You learn it once and use it in every key." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "You can do this whole page by ear: press the buttons and listen.",
      "If you play along, play lightly. None of this has to sound good yet.",
    ] },

    { type: "exercise", title: "1. The path: 1, 4, 5 and home", lines: [
      "Under this is the neck with the notes of the G major scale. Two small groups of notes are framed, and each holds {{1}}, {{4}} and {{5}}: G, C and D.",
      "Press Island 1 under the neck to hear {{1}}, {{4}}, {{5}} and the {{1}} above. Then press Island 2.",
      "Listen for the last note: after {{5}}, the high {{1}} sounds like arriving home.",
    ], tool: { type: "scale-neck", scale: "major-ionian", key: "g", islands: { notes: ["1", "4", "5"], count: 2 } }, after: [
      "Island 2 is the same path in another place on the neck: the same three notes, and the same sound.",
      "Practice until you can hum the path before you press the button.",
    ] },

    { type: "exercise", title: "2. The path as three chords", lines: [
      "Now the same path with a chord on each note: the G chord on {{1}}, the C chord on {{4}} and the D chord on {{5}}.",
      "Press Play under each chord box below in this order: G, C, D, then G again.",
    ], tool: { type: "chord-shapes", chords: ["G", "C", "D"] }, after: [
      "Practice until you can tell by ear when the G chord comes back.",
      "That's the sound of a great many songs. You'll play it with your own hands in [C, D, G](/course/2/c-d-g), and [1 → 4 → 5 → 1](/course/5/one-four-five) shows the path on the neck.",
    ] },

    { type: "exercise", title: "3. One shape, three chords", lines: [
      "This small F chord has no open strings, so it's a movable shape: every note moves when your hand does.",
      "Press Play under each chord box below: the F chord, then the same fingers two frets up for the G chord, then two frets more for the A chord.",
    ], tool: { type: "chord-shapes", chords: ["F", "G", "A"], frets: ["x x 3 2 1 x", "x x 5 4 3 x", "x x 7 6 5 x"] }, after: [
      "When the shape moves up the neck, your fingers stay as they are and only the chord's name changes.",
    ] },

    { type: "h2", text: "Read more, if you like" },
    { type: "p", text: "These guides go further into each idea. They're optional: the course teaches all of it again, a little at a time." },
    { type: "guide", slug: "intervals-and-solfege", text: "Every note from Do named two ways, as an interval and in solfège, on a piano and on the guitar neck." },
    { type: "guide", slug: "movable-chord-shapes", text: "One chord shape slid along the neck for new chords, and what to do about open strings." },
    { type: "guide", slug: "caged-system-guitar", text: "One chord in five shapes, joined up along the whole neck." },
    { type: "guide", slug: "major-and-minor-scales-guitar", text: "The 1st, 4th and 5th again, in the major and the minor scale side by side." },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Put on a song you like and listen for the moment it sounds finished. That's the chord on the home note.",
      "Know a few chords already? Play the G chord, the C chord and the D chord in a new order, and hear which order sounds finished.",
      "Come back to this page after a few stages and count how much of the list you can already play.",
    ] },
    { type: "p", text: "Each stage of the course fills in one line of this page. What gets easier is seeing that the lines are the same notes." },
  ],
};
