import type { TourStep } from "../tour";

/** The tunings page tour: an article. */
export const TUNINGS_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What other tunings give you, one thing to try, and the course lesson about strings and tuning.",
  },
  {
    target: "tunings-nav",
    title: "On this page",
    text: "Jump to the reference pitch or to your instrument.",
  },
  {
    target: "tunings-guitar",
    title: "Hear a tuning",
    text: "Click a string to hear it, Hear for the whole tuning, or Tune to open the tuner on it.",
  },
];
