/*
 * What attunr costs, in one place: the home pages, the FAQ and the terms read from here so they never disagree.
 * Prices in US dollars. The beta is free; these are the prices from launch. Changing a number here is a change to the
 * terms (/terms says when they last changed).
 */

import { FOUNDING_PARTNERS_NEEDED } from "@/lib/foundingOffer";

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
 * founding partners on /kickstarter) and the first 500 students. /account/setup and /account show it beside the full
 * price. Nothing is charged or counted yet: there is no payment, so this is the price for when paid plans open.
 */
export const EARLY_OFFER = {
  percentOff: 50,
  schools: FOUNDING_PARTNERS_NEEDED,
  students: 500,
} as const;

/** US cents at the early price, rounded to the cent. */
export const earlyCents = (cents: number): number => Math.round((cents * (100 - EARLY_OFFER.percentOff)) / 100);
