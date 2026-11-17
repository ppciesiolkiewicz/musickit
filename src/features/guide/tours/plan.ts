import type { TourStep } from "../tour";

/**
 * The /plan page tour. Before a plan is made: how it is made, and Start. With a plan: the week, the day and an exercise.
 * Only the steps on the page are walked. Each tool inside an exercise has its own tour button.
 */
export const PLAN_TOUR: TourStep[] = [
  {
    target: "plan-steps",
    title: "How the plan is made",
    text: "You answer a few questions, and attunr saves your answers for your first plan. Until new plans are ready, the demo plans show what a week looks like.",
  },
  {
    target: "plan-start",
    title: "Start",
    text: "Press Start to answer the questions. When you press Save my answers at the end, attunr keeps them.",
  },
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
    text: "When the week is done, press Plan next week to say how it went. attunr saves your notes with the plan, for the next one.",
  },
];
