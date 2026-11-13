import type { TourStep } from "../tour";

/** The arpeggios page tour. The octaves picker is Standard only; the tour does not point at it. */
export const ARPEGGIOS_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What arpeggios are for, one thing to try, and the course lesson that explains them.",
  },
  {
    target: "settings",
    title: "Key and scale",
    text: "Pick the key and the scale here. The scale stays on the neck behind the arpeggio.",
  },
  {
    target: "scale-criteria",
    title: "Which arpeggio",
    text: "Pick the note it starts on and its type. Notes outside the scale get a dashed red outline.",
  },
  {
    target: "arp-neck",
    title: "The whole neck",
    text: "Every note of the arpeggio on the neck. Press Play arpeggio to hear it up and back down.",
  },
  {
    target: "arp-positions",
    title: "One position at a time",
    text: "The same arpeggio split into hand positions. Tap a note to hear it, or play a whole position.",
  },
];
