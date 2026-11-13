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
    title: "Interval and strings",
    text: "Pick 3rds, 6ths or 4ths, and the pairs of strings to show them on.",
  },
  {
    target: "double-stops-ladder",
    title: "Up the scale",
    text: "One double stop for each note of the scale, low to high. Tap one to hear it, or press Play to hear an octave from the lowest root, up and back down.",
  },
];
