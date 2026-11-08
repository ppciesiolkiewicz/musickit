import type { TourStep } from "../tour";

/** The sing a scale page tour. The melodies and runs pages under it have no tour yet. */
export const SINGING_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "Why singing a scale helps your playing, one thing to try, and the course lesson about it.",
  },
  {
    target: "scale-settings",
    title: "Key, scale and voice",
    text: "Pick the key and scale, then your voice type so the notes sit where you can sing them.",
  },
  {
    target: "singing-controls",
    title: "Play, then sing",
    text: "Play the scale once and listen. Then switch the mic on and sing along.",
  },
  {
    target: "singing-drill",
    title: "The staff",
    text: "Tap a note to hear it. With the mic on, a dot follows your voice from note to note.",
  },
];
