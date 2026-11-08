import type { TourStep } from "../tour";

/** The improvisation page tour. */
export const IMPROV_TOUR: TourStep[] = [
  {
    target: "lesson",
    title: "Why it matters",
    text: "What improvising is for, one thing to try, and the course lesson about soloing.",
  },
  {
    target: "improv-ideas",
    title: "Two ideas",
    text: "The two ideas the exercises below are built on. Read this once.",
  },
  {
    target: "improv-rhythm",
    title: "Rhythm",
    text: "Pick two pulses and press play to hear the rhythm they make together, the pink dots. Play it on one note, then in a scale you know.",
  },
  {
    target: "improv-motive",
    title: "A motive",
    text: "Take a few notes and change their order to make new phrases from the same notes.",
  },
  {
    target: "improv-games",
    title: "Games",
    text: "Short games to play over a groove. Pick one and play it for two minutes.",
  },
];
