import type { Role } from "./model";

/**
 * What a person pays for and gets: one row of the `plans` table. Every account is on one plan (`users.plan_id`), chosen
 * on /account/setup; a new account has none until then. The rows are written by the migration that made the table (drizzle/0005_plans.sql) and changed in the
 * database, not here; this file only knows their shape and the rules for choosing one.
 *
 * The prices and allowances were set from "What one player costs", now on /dev/costs (2026-11-15): the median tokens of a
 * plan per model at API list prices, so every plan still leaves money at its full allowance. See "Plans" on that page.
 * Every plan uses the same model, `SUBSCRIPTION_MODEL`.
 */
export interface Plan {
  /** "student", "teacher-basic", "teacher-pro", "teacher-unlimited". */
  id: string;
  name: string;
  /** The role the plan gives: choosing a Teacher plan makes a student a teacher. An owner stays an owner. */
  role: Extract<Role, "student" | "teacher">;
  /** US cents a month, paid monthly. */
  monthCents: number;
  /** US cents a year, paid once a year. */
  yearCents: number;
  /** Days free before the first payment. */
  trialDays: number;
  /** Students a teacher can have on the plan; null is no limit. 0 for a student's own plan. */
  students: number | null;
  /** AI autoplans a month. AI notes spend the same allowance, `NOTES_PER_AUTOPLAN` to an autoplan. */
  autoplansPerMonth: number;
  /** Autoplans go through the Batch API: half the price, the plan arrives minutes later. */
  batch: boolean;
  /** Can be chosen. A person already on a plan that is turned off keeps it. */
  enabled: boolean;
  /** Order on the screen, smallest first. */
  sort: number;
}

export const DEFAULT_PLAN_ID = "student";

/** How a person pays for their plan: every month, or once a year. */
export type Billing = "month" | "year";
export const isBilling = (x: unknown): x is Billing => x === "month" || x === "year";

/** US cents a payment, for the billing. */
export const priceCents = (p: Pick<Plan, "monthCents" | "yearCents">, billing: Billing): number => (billing === "month" ? p.monthCents : p.yearCents);

/** US cents a year, for the billing: twelve monthly payments or one yearly. */
export const yearlyCents = (p: Pick<Plan, "monthCents" | "yearCents">, billing: Billing): number => (billing === "month" ? p.monthCents * 12 : p.yearCents);

/** How much less a year costs paid yearly than monthly, 0 to 1; 0 when it costs no less. */
export const yearSaving = (p: Pick<Plan, "monthCents" | "yearCents">): number =>
  p.monthCents > 0 ? Math.max(0, 1 - p.yearCents / (p.monthCents * 12)) : 0;

/**
 * The one model that writes every autoplan and AI note, on every plan (2026-11-15: Haiku, to keep it cheap). Plans
 * differ in price, allowance and students, never in model; /dev/costs costs every plan on it.
 */
export const SUBSCRIPTION_MODEL = "claude-haiku-5-5";

/** As in `PRICING.player.notesPerPlan`: an AI note spends a third of an autoplan. */
export const NOTES_PER_AUTOPLAN = 3;

/** The plans a person can see on /account: the enabled ones, and the one they are on even when it is turned off. In `sort` order. */
export const choosablePlans = (plans: Plan[], currentId: string | null): Plan[] =>
  plans.filter((p) => p.enabled || p.id === currentId).sort((a, b) => a.sort - b.sort);

/**
 * May this person move to `planId`, paid by `billing`? Only to an enabled plan, and not to the one they are on paid the
 * same way. Their own plan, even turned off, can move to the other billing.
 */
export function canChoose(plans: Plan[], current: { planId: string | null; billing: Billing }, planId: unknown, billing: unknown): Plan | null {
  if (!isBilling(billing)) return null;
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return null;
  if (plan.id === current.planId) return billing !== current.billing ? plan : null;
  return plan.enabled ? plan : null;
}

/** The role a person has after choosing `plan`. An owner runs a school and stays an owner on any plan. */
export const roleOnPlan = (role: Role, plan: Plan): Role => (role === "owner" ? "owner" : plan.role);

/** "$27", "$12.50". */
export const dollars = (cents: number): string => {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
};

/** "$27 a year", "$9 a month". */
export const priceLabel = (p: Pick<Plan, "monthCents" | "yearCents">, billing: Billing): string => `${dollars(priceCents(p, billing))} a ${billing}`;

/** "$9 a month or $27 a year". */
export const bothPricesLabel = (p: Pick<Plan, "monthCents" | "yearCents">): string => `${priceLabel(p, "month")} or ${priceLabel(p, "year")}`;

/** "Save 33%" paid yearly; null when a year costs no less. */
export const savingLabel = (p: Pick<Plan, "monthCents" | "yearCents">): string | null => {
  const pct = Math.round(yearSaving(p) * 100);
  return pct > 0 ? `Save ${pct}%` : null;
};

/** "First 14 days free"; null with no trial. */
export const trialLabel = (p: Pick<Plan, "trialDays">): string | null => (p.trialDays > 0 ? `First ${p.trialDays} days free` : null);

/** "8 AI autoplans a month, or 24 AI notes". */
export const allowanceLabel = (p: Pick<Plan, "autoplansPerMonth">): string =>
  `${p.autoplansPerMonth} AI autoplans a month, or ${p.autoplansPerMonth * NOTES_PER_AUTOPLAN} AI notes`;

/** "Up to 10 students", "Any number of students"; null for a student's own plan. */
export const studentsLabel = (p: Pick<Plan, "students">): string | null =>
  p.students === null ? "Any number of students" : p.students > 0 ? `Up to ${p.students} students` : null;

/** The model's name as people know it: "claude-sonnet-5-5" → "Sonnet 5.5". */
export const modelLabel = (id: string): string => {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}` : id;
};
