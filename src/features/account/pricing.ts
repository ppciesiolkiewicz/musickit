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

/**
 * The early price: every plan at half its price, locked in (it doesn't go up later), for the first 20 schools (the
 * founding partners on /kickstarter, who pick any teacher plan, of any size) and the first 500 students. Every page that
 * quotes a price shows it beside the full one, with `DiscountBadge`, while that side's places are not all taken
 * (`earlyOpen`). Nothing is charged yet: there is no payment, so this is the price for when paid plans open.
 */
export const EARLY_OFFER = {
  percentOff: 50,
  schools: 20,
  students: 500,
} as const;

/** The founding partners' offer, as it is written: "50% off any teacher plan". */
export const FOUNDING_OFFER = `${EARLY_OFFER.percentOff}% off any teacher plan`;

/** How many early places are taken: schools (the founding partners) and students. `earlyTaken()` in server/earlyTaken.ts counts them. */
export type EarlyTaken = { schools: number; students: number };

/** Whether the early price is still open, by side of the plans: while fewer have taken it than there are places. */
export type EarlyOpen = { individual: boolean; teachers: boolean };

export const earlyOpen = (taken: EarlyTaken): EarlyOpen => ({
  individual: taken.students < EARLY_OFFER.students,
  teachers: taken.schools < EARLY_OFFER.schools,
});

/** US cents at the early price, rounded to the cent. */
export const earlyCents = (cents: number): number => Math.round((cents * (100 - EARLY_OFFER.percentOff)) / 100);
