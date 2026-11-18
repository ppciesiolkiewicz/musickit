/**
 * The founding-partner offer in numbers, in one place: the page at /kickstarter and the email brief on /dev/kickstarter
 * both read it, so a page and an email never quote two prices. The price is the early price (`EARLY_OFFER` in
 * features/account/pricing.ts): any teacher plan, of any size, at 50% off, locked in.
 */

import { EARLY_OFFER, FOUNDING_OFFER } from "@/features/account/pricing";

/** What a founding partner pays, as it is written: "50% off any teacher plan". */
export { FOUNDING_OFFER };

/** How long a founding partner tries attunr before the paid year starts. */
export const FOUNDING_TRIAL_DAYS = 90;

/** How many founding partners the project needs before it starts: the schools that get the early price. */
export const FOUNDING_PARTNERS_NEEDED = EARLY_OFFER.schools;

/* How many have joined is counted on the server: `earlyTaken().schools` (features/account/server/earlyTaken.ts). */
