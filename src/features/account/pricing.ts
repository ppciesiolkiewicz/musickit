/*
 * What attunr costs, in one place: the home pages, the FAQ and the terms read from here so they never disagree.
 * Prices in Australian dollars (the same number in US dollars for a US buyer, `ALSO_IN` in server/stripe.ts). The beta is free; these are the prices from launch. Changing a number here is a change to the
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
 * Only for /admin/dev/costs: the allowance of AI-written plans a month that its cost model still prices. Plans are put
 * together with no AI and are unlimited, so no page a player reads shows this number.
 */
export const OLD_AI_PLANS_PER_MONTH = 8;

/**
 * The early price: half the price of every plan, monthly or yearly, locked in (it doesn't go up while the person stays subscribed),
 * for the first 20 schools (the founding partners on /kickstarter, who pick any teacher plan, of any size) and the first
 * 500 students to sign up. Since 2026-11-24 (user) it is off the yearly price too. Every page that quotes a price shows it beside the full one,
 * with `DiscountBadge`, while that side's places are not all taken (`earlyOpen`). A plan priced with the school
 * (Unlimited) is half the price agreed. Nothing is charged yet: there is no payment, so this is the price for
 * when paid plans open.
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

/** US cents at the early price, rounded to the cent. Monthly or yearly. */
export const earlyCents = (cents: number): number => Math.round((cents * (100 - EARLY_OFFER.percentOff)) / 100);

/** Whether the early price changes what is paid: monthly and yearly alike, while the side's places are open. */
export const earlyApplies = (_billing: "month" | "year", open: boolean): boolean => open;
