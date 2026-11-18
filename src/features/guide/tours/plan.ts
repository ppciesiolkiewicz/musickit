import type { TourStep } from "../tour";

/**
 * The /plan page tour. Before the questions: how the plan is made, and Start. With today's plan: Get another plan, the day
 * and an exercise (a seven-day plan's week strip where one is drawn).
 * Only the steps on the page are walked. Each tool inside an exercise has its own tour button.
 */
export const PLAN_TOUR: TourStep[] = [
  {
    target: "plan-steps",
    title: "How the plan is made",
    text: "You answer a few questions, and attunr puts today's plan together from library exercises that fit your answers. Each day you open this page, attunr makes a new plan.",
  },
  {
    target: "plan-start",
    title: "Start",
    text: "Press Start to answer the questions. When you press Save my answers at the end, attunr puts today's plan together.",
  },
  {
    target: "plan-week",
    title: "Your week",
    text: "Each day of the plan has its own exercises. Tap a day to open it. The bar under a day fills as you mark its exercises done.",
  },
  {
    target: "plan-another",
    title: "Get another plan",
    text: "Press Get another plan to swap the exercises you haven't rated for other ones. The ones you rated stay.",
  },
  {
    target: "plan-day",
    title: "Today",
    text: "How many exercises the day has and how long they take.",
  },
  {
    target: "plan-exercise",
    title: "An exercise",
    text: "Read the steps, then use the tools in it. Each tool has its own small tour button, top right. When you finish, rate how it went with the stars.",
  },
];
