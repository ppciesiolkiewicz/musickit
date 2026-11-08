import type { TourStep } from "../tour";

/** The guitar basics page tour: an article in three parts. */
export const BASICS_TOUR: TourStep[] = [
  {
    target: "basics-notes",
    title: "Strings and frets",
    text: "The six strings and how to name any fret. Start here if the neck is new to you.",
  },
  {
    target: "basics-intervals",
    title: "Intervals",
    text: "Pick an interval and a start note. See it on the piano, then every way to play it on the neck. Press Hear it to listen.",
  },
  {
    target: "basics-jumps",
    title: "Jumps worth knowing",
    text: "Three intervals you will use all the time. Show it on the neck sets the viewer above to that interval.",
  },
];
