import type { TourStep } from "../tour";

/** The /plan page tour: the week, the day and an exercise. Each tool inside an exercise has its own tour button. */
export const PLAN_TOUR: TourStep[] = [
  {
    target: "plan-week",
    title: "Your week",
    text: "Each day of the plan has its own exercises. Tap a day to open it. The bar under a day fills as you mark its exercises done.",
  },
  {
    target: "plan-day",
    title: "Today",
    text: "The open day's theme, how many exercises it has and how long they take.",
  },
  {
    target: "plan-exercise",
    title: "An exercise",
    text: "Read the steps, then use the tools in it. Each tool has its own small tour button, top right. Mark the exercise done when you finish.",
  },
  {
    target: "plan-next",
    title: "Next week",
    text: "When the week is done, plan the next one. Your AI builds on what you did and skipped.",
  },
];
