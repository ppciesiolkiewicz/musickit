import type { TourStep } from "../tour";

/** The double stops page tour. */
export const DOUBLE_STOPS_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What double stops are for, one thing to try, and the course lesson about them.",
  },
  {
    target: "scale-settings",
    title: "Key and scale",
    text: "Pick the key and the scale the double stops come from.",
  },
  {
    target: "scale-criteria",
    title: "Interval and root",
    text: "Pick 3rds, 6ths or 4ths, and the string the root is on. The pair of strings follows from it.",
  },
  {
    target: "double-stops-ladder",
    title: "Up the scale",
    text: "One octave of double stops from the root. Each is two notes of the chord named above it, and that chord's root is ringed. Tap one to hear it, or press Play to hear the octave up and back down.",
  },
];
