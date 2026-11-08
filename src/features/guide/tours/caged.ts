import type { TourStep } from "../tour";

/** The CAGED page tour. */
export const CAGED_TOUR: TourStep[] = [
  {
    target: "scale-settings",
    title: "Key",
    text: "Pick the key and major or minor here. Every box on the page follows it.",
  },
  {
    target: "caged-notes",
    title: "The notes",
    text: "The notes of the arpeggio, the pentatonic and the scale, with the interval of each one above it.",
  },
  {
    target: "caged-map",
    title: "The five boxes",
    text: "The whole neck in five colours, one for each shape. Tap a note to hear it.",
  },
  {
    target: "caged-box",
    title: "One box",
    text: "Each box gets its own card: the chord shape, then its arpeggio, scale and pentatonic. Learn one box at a time.",
  },
  {
    target: "caged-neighbours",
    title: "Shape neighbours",
    text: "The other chords of the key, found in the same few frets, so you can change chords without moving your hand.",
  },
];
