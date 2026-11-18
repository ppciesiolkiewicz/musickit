/**
 * The early offer to students in numbers, in one place: /dev/kickstarter (Students) reads it, and so will an ad or a
 * sign-up page, so no two of them quote two prices. Nothing is charged or counted yet: there is no payment, so this is
 * the plan for when paid plans open.
 */

import { EARLY_OFFER, PRICING, earlyCents } from "@/features/account/pricing";

/** How many of the first people to sign up get the early price (`EARLY_OFFER`). */
export const FIRST_STUDENTS = EARLY_OFFER.students;

/** The yearly price anyone else pays, as it is written. */
export const STUDENT_PRICE = PRICING.player.price;

/** The early price for a year, as it is written: half the yearly price. It is locked in: it doesn't go up later. */
export const FIRST_STUDENTS_PRICE = `$${earlyCents(PRICING.player.priceNumber * 100) / 100}`;
