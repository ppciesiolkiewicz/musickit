import type { CourseArticle } from "../model";

/** Course section `augmented-chords`, written in the /learn articles' style. */
export const augmentedChords: CourseArticle = {
  updated: "2026-11-28T02:30",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "Every colour chord so far added a note: a 6th, a 7th, a 9th. An augmented chord moves one instead. Take a major chord and raise its 5th by a half step." },
    { type: "p", text: "The G chord is G, B and D. Gaug is G, B and D♯. That raised note has nowhere to rest, so the chord floats and wants to slide on to the next one. In songs it's usually a passing chord: one bar of tension between two plain chords." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab: an augmented chord sounds odd enough in tune.",
      "Press only as hard as each note needs, and shake your hand loose between tries.",
    ] },

    { type: "exercise", title: "1. Major, then augmented", lines: [
      "Tap {{1}}, {{3}} and {{5}} on the staff below: C major, one note at a time.",
    ], tool: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", notes: ["1", "3", "5"], mic: false },
    between: [
      "Now tap {{1}}, {{3}} and {{#5}} on this staff: C augmented. Only the top note moved, up a half step from G to the ringed G♯.",
      "Go between the two staffs until you can hum the raised note before you tap it.",
    ],
    beside: { type: "staff", scale: "major-ionian", key: "c", voice: "tenor", notes: ["1", "3", "#5"], highlight: ["#5"], mic: false } },

    { type: "exercise", title: "2. One note up", lines: [
      "Press a chord box below to hear it, then play each pair on your guitar. From the G chord to Gaug only the D string moves, from open to the 1st fret. From the C chord to Caug the G string does the same.",
      "Then press Intervals under the chord boxes. The 5 turns into ♯5, and the root and the 3 stay put.",
    ], tool: { type: "chord-shapes", chords: ["G", "Gaug", "C", "Caug"], frets: [null, "3 2 1 0 0 3 | 3 2 1 0 0 4", null, "x 3 2 1 1 0 | x 3 2 1 1 0"] }, after: [
      "Practice until you can tell each pair apart with your eyes closed.",
    ] },

    { type: "exercise", title: "3. A step to the next chord", lines: [
      "Press the G, Gaug and C chord boxes below, in that order and in a slow, even count.",
      "Gaug's D♯ sits a half step under the E of the C chord, so it leads straight there. Play the three on your guitar and listen for that note climbing.",
    ], tool: { type: "chord-shapes", chords: ["G", "Gaug", "C"], frets: [null, "3 2 1 0 0 3 | 3 2 1 0 0 4", null] }, after: [
      "Practice until the change from Gaug to the C chord feels like one move.",
    ] },

    { type: "exercise", title: "4. Now from C", lines: [
      "Press the C, Caug and F chord boxes below in the same way. On the G string the note climbs one fret at a time: G, G♯, then the A of the F chord.",
    ], tool: { type: "chord-shapes", chords: ["C", "Caug", "F"], frets: [null, "x 3 2 1 1 0 | x 3 2 1 1 0", null] }, after: [
      "When you change the root, the chords are new but the raised 5th still leads up a half step into the next chord.",
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "In a G C D G loop, put one bar of Gaug between the G chord and the C chord.",
      "Pick only the G string: open, 1st fret, 2nd fret. That's the climb inside C, Caug and F on its own.",
      "Play Gaug and let it ring without moving on. Then let it land on the C chord.",
    ] },
    { type: "p", text: "Soon you'll hear an augmented chord in a song as that little lift before the next chord. Next, [the diminished chord](/course/7/diminished-chords) lowers a 5th instead." },
  ],
};
