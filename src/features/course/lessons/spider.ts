import type { CourseArticle } from "../model";

/** Course section `spider`, written in the /learn articles' style. */
export const spider: CourseArticle = {
  updated: "2026-11-28T02:31",
  versions: { agents: 3, teaching: 14, voice: 6 },
  blocks: [
    { type: "p", text: "In [Keeping a steady beat](/course/1/steady-beat) your strumming hand learned to keep time. Now it's the other hand's turn: the fingers that press the strings." },
    { type: "p", text: "The spider gives each finger its own fret, one finger per fret, and walks them across all six strings. It's a small drill, but it builds the fingertips and the reach that every chord in the next stage needs." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Rest the guitar on your leg and keep your thumb behind the neck, not over the top.",
      "Press each string just behind its fret, with the tip of your finger.",
      "Short and often beats long and sore: a few minutes a day is plenty.",
    ] },
    { type: "care", text: "_Stop and shake out your hand as soon as it aches._" },

    { type: "exercise", title: "1. The spider at the 5th fret", lines: [
      "The frets are closer together at the 5th fret, so four fingers reach four frets without a stretch.",
      "Press Play below to start the metronome. The notes of the drill play with it, and the note playing is lit on the tab.",
      "Follow the tab: frets 5 to 8 with fingers 1, 2, 3 and 4, one note per beat. Start on the low E string, play the four frets on each string up to the high e string, then come back down the same way. The row under the tab shows the finger for each note.",
      "Practice until your hand stays still and only the fingers move.",
    ], tool: { type: "finger-pattern", level: "new", show: "finger", bpm: 50 }, after: [
      "If a note buzzes, press that finger closer to its fret when it comes round on the next string.",
    ] },

    { type: "exercise", title: "2. Pick down, then up", lines: [
      "Now the row under the tab shows the pick: ↓ for a down stroke, ↑ for an up stroke. This is alternate picking.",
      "Press Play below to start the metronome, and play the same frets with the pick strokes the row shows.",
      "Practice until the up strokes are as loud as the down strokes.",
    ], tool: { type: "finger-pattern", level: "new", show: "pick", bpm: 50 } },

    { type: "exercise", title: "3. Down to the 1st fret", lines: [
      "Low on the neck the frets are wider, and that's where the open chords live.",
      "Press Play below to start the metronome and follow the tab: frets 1 to 4 with fingers 1, 2, 3 and 4, from the low E string up to the high e string and back down.",
      "If finger 4 can't reach fret 4, let your thumb slide a little lower on the back of the neck.",
      "Practice until the order is in your muscle memory: your fingers go 1, 2, 3, 4 without you thinking.",
    ], tool: { type: "finger-pattern", level: "beginner", show: "finger", bpm: 50 } },

    { type: "exercise", title: "4. A new order: 1, 3, 2, 4", lines: [
      "Fingers 2 and 3 like to move together. This order sends them one after the other, so each learns to move alone.",
      "Press Play below to start the metronome. On each string, play frets 5, 7, 6 and 8 with fingers 1, 3, 2 and 4, as the row under the tab shows.",
      "Practice until fingers 2 and 3 land one after the other, never together.",
    ], tool: { type: "finger-pattern", level: "intermediate", fret: 5, show: "finger", bpm: 50 } },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Play only the low E and A strings, up and back, and listen to every note.",
      "Start on the high e string and go down to the low E first.",
      "Play the spider at the 3rd fret, halfway between the two you've played.",
      "Close your eyes for one string and let your fingers find the frets.",
    ] },
    { type: "p", text: "First your fingers need watching. After a while they find their frets on their own, and pressing a chord gets easier with them." },
  ],
};
