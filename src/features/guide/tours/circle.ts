import type { TourStep } from "../tour";

/** The circle of fifths page tour. */
export const CIRCLE_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What the circle is for, one thing to try, and the course lesson about it.",
  },
  {
    target: "circle-wheel",
    title: "The circle",
    text: "Majors on the outer ring, minors on the inner one. Click a key to pick it. Its seven chords light up.",
  },
  {
    target: "circle-key",
    title: "The key you picked",
    text: "Its key signature and its chords. Click a chord to hear it, or jump to a nearby key with the buttons below.",
  },
  {
    target: "circle-read",
    title: "How to read it",
    text: "A short guide to what the rings, the lit slice and the neighbours mean.",
  },
];
