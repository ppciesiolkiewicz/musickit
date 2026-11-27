import type { CourseArticle } from "../model";

/** Course section `do-mi-sol-shapes`, written in the /learn articles' style. */
export const doMiSolShapes: CourseArticle = {
  updated: "2026-11-28T02:30",
  labels: "solfege",
  blocks: [
    { type: "p", text: "In [One arpeggio through all five shapes](/course/8/one-arpeggio) you followed G, B and D up the neck. Now give each note its name: Do for G, Mi for B and Sol for D." },
    { type: "p", text: "Once you know which name sits under each finger, you can aim a line at the note you want, in any shape: Do to sound finished, Mi or Sol to keep it moving." },

    { type: "h2", text: "Before you start" },
    { type: "list", items: [
      "Tune your guitar first. The [tuner](/tuner) opens in a new tab.",
      "Play one note at a time, slowly. Say its name as you play it.",
    ] },
    { type: "care", text: "_Rest your hand when your fingers or wrist start to ache._" },

    { type: "exercise", title: "1. Every Do, Mi and Sol of G", lines: [
      "Every dot on this neck is a note of the G chord, named Do, Mi or Sol. Each coloured frame is one CAGED shape of the G chord, from the G shape at the nut up the neck. Tap any dot to hear it.",
      "Play every Do on the neck, from the nut up to the 12th fret. Then every Mi, then every Sol.",
    ], tool: { type: "caged-neck", key: "g", scale: "major-ionian", islands: true }, after: [
      "Practice until you can point at any Mi without reading its name.",
    ] },

    { type: "exercise", title: "2. Inside the E shape", lines: [
      "Here's the E shape of G, the barre chord at the 3rd fret. Look at the G arpeggio neck: only Do, Mi and Sol.",
      "Start on the Do on the low E string, 3rd fret. Play every dot string by string up to the Do on the high e string, 3rd fret, then come back down the same way.",
    ], tool: { type: "caged-neck", key: "g", scale: "major-ionian", shapes: ["E"] }, after: [
      "Then hold the G barre chord and pick it one string at a time, low to high: Do, Sol, Do, Mi, Sol, Do.",
      "Mi on the G string sits one string up and one fret down from Do on the D string.",
      "Practice until the names come without thinking.",
    ] },

    { type: "exercise", title: "3. The D, C and A shapes", lines: [
      "Here's the D shape of G, with its Do on the D string, 5th fret. On the G arpeggio neck, play from that Do up to the Do on the B string, 8th fret, saying each name: Do, Mi, Sol, Do.",
    ], tool: { type: "caged-neck", key: "g", scale: "major-ionian", shapes: ["D"] }, parts: [
      { title: "The C shape", lines: [
        "In the C shape the Do is on the A string, 10th fret. Pick the C shape's chord one string at a time, from the A string up to the high e string: Do, Mi, Sol, Do, Mi.",
      ], tool: { type: "caged-neck", key: "g", scale: "major-ionian", shapes: ["C"] } },
      { title: "The A shape", lines: [
        "The A shape keeps its Do on the A string, 10th fret, too. Pick its chord from the A string up: Do, Sol, Do, Mi, Sol.",
        "From the C shape to the A shape the Do on the A string stays put, and the names around it change places.",
        "Practice until you can name every dot in a shape before you play it.",
      ], tool: { type: "caged-neck", key: "g", scale: "major-ionian", shapes: ["A"] } },
    ] },

    { type: "h2", text: "Make it your own" },
    { type: "list", items: [
      "Pick one name, say Mi, and play it in each shape on the neck in exercise 1, from the nut up to the 12th fret and back.",
      "Make up a short line in one shape and end it on Do. Then end the same line on Mi, and listen for which one sounds finished.",
      "Try the C chord: Do is C, Mi is E and Sol is G. The [CAGED explorer](/theory/caged) shows its five shapes.",
    ] },
    { type: "p", text: "Soon a chord up the neck stops being a shape to remember and turns into three names you can aim for." },
  ],
};
