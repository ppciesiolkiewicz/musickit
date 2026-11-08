import type { TourStep } from "../tour";

/** The triads page tour. */
export const TRIADS_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What triads are for, one thing to try, and the course lesson about them.",
  },
  {
    target: "scale-settings",
    title: "Root",
    text: "Pick the root note of the triad here.",
  },
  {
    target: "scale-criteria",
    title: "Triad and strings",
    text: "Pick major, minor or another type, and the sets of three strings to show it on.",
  },
  {
    target: "triads-essential",
    title: "Essential triads",
    text: "Shapes you know from open chords, each with the IV and V chords under the same hand. Tap a shape to hear it.",
  },
  {
    target: "triads-group",
    title: "Every shape",
    text: "Each string group in all three inversions. Each inversion says which note of the chord is lowest.",
  },
];
