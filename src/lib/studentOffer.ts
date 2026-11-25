/**
 * The early offer to students in numbers, in one place: /admin/dev/kickstarter (Students) reads it, and so will an ad or a
 * sign-up page, so no two of them quote two prices. Nothing is charged or counted yet: there is no payment, so this is
 * the plan for when paid plans open.
 */

import { EARLY_OFFER, PRICING, earlyCents } from "@/features/account/pricing";

/** How many of the first people to sign up get the early price (`EARLY_OFFER`). */
export const FIRST_STUDENTS = EARLY_OFFER.students;

/** The monthly price anyone else pays, as it is written. The early price is half of it, and half the yearly price too. */
export const STUDENT_PRICE = PRICING.player.monthPrice;

/** The early price for a month, as it is written: half the monthly price. It is locked in: it doesn't go up later. */
export const FIRST_STUDENTS_PRICE = `$${earlyCents(PRICING.player.monthCents) / 100}`;

/** "$3 a month instead of $5.99": the early price beside the full one, wherever a page quotes it. */
export const FIRST_STUDENTS_LINE = `${FIRST_STUDENTS_PRICE} a month instead of ${STUDENT_PRICE}`;
