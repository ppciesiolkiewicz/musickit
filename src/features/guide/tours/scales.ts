import type { TourStep } from "../tour";

/** The scales and modes page tour. */
export const SCALES_TOUR: TourStep[] = [
  {
    target: "scale-settings",
    title: "Key",
    text: "Pick the key here. Every scale on the page starts on it.",
  },
  {
    target: "scales-search",
    title: "Find a scale",
    text: "Type a name such as dorian or minor to show only the scales that match.",
  },
  {
    target: "scales-pent",
    title: "Start with the pentatonics",
    text: "The two five-note scales most solos start from. Tap a note to hear it, or press Play to hear the scale.",
  },
  {
    target: "scales-modes",
    title: "The modes",
    text: "One card per mode. Open a card for its chords and its positions on the whole neck.",
  },
  {
    target: "scales-compare",
    title: "Compare",
    text: "Compare modes: the notes they share and what each one adds.",
  },
];
