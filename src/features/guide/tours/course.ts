import type { TourStep } from "../tour";

/** The course index tour. */
export const COURSE_TOUR: TourStep[] = [
  {
    target: "course-start",
    title: "Start here",
    text: "The first section of the course. New to guitar? Begin here. The order is a guide, not a rule.",
  },
  {
    target: "course-layout",
    title: "Your way",
    text: "Show the course by stage or by topic, or only the sections you rated: the ones to work on, or the ones you have solid.",
  },
  {
    target: "course-stage",
    title: "A stage",
    text: "A stage is a group of sections on one theme. Open any section in it. Nothing has to be mastered before you move on.",
  },
];
