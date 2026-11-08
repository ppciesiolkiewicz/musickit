import type { TourStep } from "../tour";

/** The tuner page tour. The reference pitch is Standard only, so Simple skips that step. */
export const TUNER_TOUR: TourStep[] = [
  {
    target: "tuner-meter",
    title: "The meter",
    text: "The tuner listens as soon as the page opens. Play one string and let it ring: the needle leans left when you are flat and right when you are sharp.",
  },
  {
    target: "tuner-strings",
    title: "Hear a string",
    text: "Click a string to hear the pitch it should have. The string you are playing lights up, green when it is in tune.",
  },
  {
    target: "tuner-instrument",
    title: "Your instrument",
    text: "Pick your instrument here and its tuning below. Chromatic tunes any note.",
  },
  {
    target: "tuner-input",
    title: "Input",
    text: "Pick the microphone or audio interface the tuner listens to.",
  },
  {
    target: "tuner-a4",
    title: "Reference pitch",
    text: "Leave A4 at 440 Hz unless you play with others who tune to a different pitch.",
  },
];
