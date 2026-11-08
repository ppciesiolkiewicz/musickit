import type { TourStep } from "../tour";

/** The chord explorer page tour. It walks the Shapes tab, which the page opens on. */
export const CHORDS_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What chords are for, one thing to try, and the course lesson that starts with them.",
  },
  {
    target: "chords-tabs",
    title: "Three ways in",
    text: "Shapes shows every chord shape. In a key shows the chords that fit a key. Progressions shows common chord changes and where to play them.",
  },
  {
    target: "chords-search",
    title: "Search",
    text: "Type a chord name such as Am or G7 to see every way to play it, or a word such as open to filter the shapes.",
  },
  {
    target: "chords-results",
    title: "The shapes",
    text: "Open chords come first. Tap a diagram to hear it.",
  },
];
