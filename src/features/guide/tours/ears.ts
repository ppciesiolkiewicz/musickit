import type { TourStep } from "../tour";

/** The ear training page tour. The play and answer targets are shared with the interval ears exercise. */
export const EARS_TOUR: TourStep[] = [
  {
    target: "ears-setup",
    title: "What to train",
    text: "Intervals or chord quality.",
  },
  {
    target: "ears-settings",
    title: "Level",
    text: "Each level adds intervals. Start at level 1 and stay there until it feels easy.",
  },
  {
    target: "interval-ears-play",
    title: "Listen",
    text: "Press Start to hear one. Replay plays it again as often as you like.",
  },
  {
    target: "interval-ears-answers",
    title: "Answer",
    text: "Tap the name you heard. The right answer lights green. For an interval you also get a song that starts with the same jump.",
  },
];
