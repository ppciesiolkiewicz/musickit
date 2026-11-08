import type { TourStep } from "../tour";

/** The rhythm page tour. */
export const RHYTHM_TOUR: TourStep[] = [
  {
    target: "rhythm-pick",
    title: "Pick a rhythm",
    text: "Start with the first one and move on when you hit every note.",
  },
  {
    target: "rhythm-start",
    title: "Start",
    text: "Press Start. A bar of clicks counts you in.",
  },
  {
    target: "rhythm-lane",
    title: "The lane",
    text: "Notes move towards the line. Hit each one as it reaches the line. At the end you get a score for how close you were.",
  },
  {
    target: "rhythm-setup",
    title: "Set up",
    text: "Play with Space or a tap, or strum your guitar into the mic. Pick a slow tempo to begin.",
  },
];
