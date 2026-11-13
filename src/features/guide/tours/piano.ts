import type { TourStep } from "../tour";

/** The piano page tour. */
export const PIANO_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "Why it helps to see degrees and intervals as you play, one thing to try, and the course lesson about it.",
  },
  {
    target: "piano-key",
    title: "Key",
    text: "Pick the key and scale here. Every note on the staff is named in it.",
  },
  {
    target: "piano-staff",
    title: "The staff",
    text: "Each note you play appears here with its scale degree and the interval from the note before. Play notes together and it names the chord. Clear staff starts it over.",
  },
  {
    target: "piano-keys",
    title: "The keyboard",
    text: "Click the keys, use your computer keys, or connect a MIDI keyboard.",
  },
  {
    target: "piano-labels",
    title: "Four ways to name a note",
    text: "Note names, degrees, intervals or solfège. Pick one and every keyboard and neck on the site follows it.",
  },
];
