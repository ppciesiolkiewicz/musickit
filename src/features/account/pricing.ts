/*
 * What attunr costs, in one place: the home pages, the FAQ and the terms read from here so they never disagree.
 * Prices in US dollars. The beta is free; these are the prices from launch. Changing a number here is a change to the
 * terms (/terms says when they last changed).
 */

export const PRICING = {
  player: {
    /** shown as written */
    price: "$36",
    priceNumber: 36,
    period: "a year",
    /** paid monthly, shown as written; the early price is half of this one */
    monthPrice: "$5.99",
    monthCents: 599,
    guaranteeDays: 30,
  },
  school: {
    /** priced by agreement; the home page sends a school to the contact form */
    guaranteeDays: 30,
  },
} as const;

/**
 * Only for /dev/costs: the allowance of AI-written plans a month that its cost model still prices. Plans are put
 * together with no AI and are unlimited, so no page a player reads shows this number.
 */
export const OLD_AI_PLANS_PER_MONTH = 8;

/**
 * The early price: half the monthly price of every plan, locked in (it doesn't go up while the person stays subscribed),
 * for the first 20 schools (the founding partners on /kickstarter, who pick any teacher plan, of any size) and the first
 * 500 students to sign up. It is for paying monthly only (user, 2026-11-18): the yearly price stays as it is, which is
 * what twelve months at the early price come to. Every page that quotes a monthly price shows it beside the full one,
 * with `DiscountBadge`, while that side's places are not all taken (`earlyOpen`). A plan priced with the school
 * (Unlimited) is half the monthly price agreed. Nothing is charged yet: there is no payment, so this is the price for
 * when paid plans open.
 */
export const EARLY_OFFER = {
  percentOff: 50,
  schools: 20,
  students: 500,
} as const;

/** The founding partners' offer, as it is written: "50% off any teacher plan, paid monthly". */
export const FOUNDING_OFFER = `${EARLY_OFFER.percentOff}% off any teacher plan, paid monthly`;

/** How many early places are taken: schools (the founding partners) and students. `earlyTaken()` in server/earlyTaken.ts counts them. */
export type EarlyTaken = { schools: number; students: number };

/** Whether the early price is still open, by side of the plans: while fewer have taken it than there are places. */
export type EarlyOpen = { individual: boolean; teachers: boolean };

export const earlyOpen = (taken: EarlyTaken): EarlyOpen => ({
  individual: taken.students < EARLY_OFFER.students,
  teachers: taken.schools < EARLY_OFFER.schools,
});

/** US cents at the early price, rounded to the cent. Give it a monthly price: a yearly one has no early price. */
export const earlyCents = (cents: number): number => Math.round((cents * (100 - EARLY_OFFER.percentOff)) / 100);

/** Whether the early price changes what is paid this way: only monthly, and only while the side's places are open. */
export const earlyApplies = (billing: "month" | "year", open: boolean): boolean => open && billing === "month";
