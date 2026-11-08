import type { TourStep } from "../tour";

/** The FAQ page tour. */
export const FAQ_TOUR: TourStep[] = [
  {
    target: "faq-group",
    title: "Getting started",
    text: "Questions come in groups: getting started, the microphone and sound, the practice plan and the video course.",
  },
  {
    target: "faq-question",
    title: "Open a question",
    text: "Click a question to see its answer. Click it again to close it.",
  },
];
