/*
 * What attunr costs, in one place: the home pages, the FAQ and the terms read from here so they never disagree.
 * Prices in US dollars. The beta is free; these are the prices from launch. Changing a number here is a change to the
 * terms (/terms says when they last changed).
 */

/** One autoplan is one week of exercises; the same allowance can be spent on AI notes, three to an autoplan. */
const PLANS_PER_MONTH = 8;
const NOTES_PER_PLAN = 3;

export const PRICING = {
  player: {
    /** shown as written */
    price: "$36",
    priceNumber: 36,
    period: "a year",
    plansPerMonth: PLANS_PER_MONTH,
    notesPerPlan: NOTES_PER_PLAN,
    notesPerMonth: PLANS_PER_MONTH * NOTES_PER_PLAN,
    guaranteeDays: 30,
  },
  school: {
    /** priced by agreement; the home page sends a school to the contact form */
    guaranteeDays: 30,
  },
} as const;
