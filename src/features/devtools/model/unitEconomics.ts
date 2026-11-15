import type { DevModel } from "./models";
import type { RunSummary } from "./history";
import { API_PRICES } from "./pricing";

/**
 * What one paying player costs a year, for /dev/costs: the AI that writes their autoplans (tokens measured from the
 * published compare-models runs, at API list prices), the daily emails, the payment fee and hosting, against the price.
 */

/** Haiku 5.5's list price for a prompt over 100k tokens (the whole request is billed at it). Others have one price. */
const LONG_PROMPT: Partial<Record<DevModel, { from: number; input: number; output: number }>> = {
  "claude-haiku-5-5": { from: 100_000, input: 0.5, output: 2.5 },
};

/** US$ for one request of `input` and `output` tokens at list price; null for an unpriced model. */
export function requestCost(model: DevModel, input: number, output: number): number | null {
  const p = API_PRICES[model];
  if (!p) return null;
  const long = LONG_PROMPT[model];
  const { input: i, output: o } = long && input > long.from ? long : p;
  return (input * i + output * o) / 1e6;
}

/**
 * Haiku's call that decides, for every autoplan, whether to take a plan from the library or write a new one: the
 * player's answers and a list of the library's plans in, a choice out. An estimate until it is built and measured.
 */
export const PICK_TOKENS = { model: "claude-haiku-5-5" as DevModel, input: 8_000, output: 300 };

/** US$ for one decide call. */
export const pickCost = (): number => requestCost(PICK_TOKENS.model, PICK_TOKENS.input, PICK_TOKENS.output) ?? 0;

export interface PlanTokens { model: DevModel; label: string; runs: number; input: number; output: number }

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The median tokens of one plan per model, from runs that wrote a plan and kept their token counts. Every input token counts, cached or not. */
export function planTokens(runs: Pick<RunSummary, "model" | "ok" | "usage">[]): PlanTokens[] {
  const by = new Map<DevModel, { input: number[]; output: number[] }>();
  for (const r of runs) {
    if (!r.ok || !r.usage || r.model === "pasted" || !API_PRICES[r.model]) continue;
    const b = by.get(r.model) ?? { input: [], output: [] };
    b.input.push(r.usage.input + r.usage.cacheRead + r.usage.cacheWrite);
    b.output.push(r.usage.output);
    by.set(r.model, b);
  }
  return [...by].map(([model, b]) => ({ model, label: API_PRICES[model]!.label, runs: b.input.length, input: Math.round(median(b.input)), output: Math.round(median(b.output)) }));
}

export interface Assumptions {
  /** US$ a year */
  price: number;
  /** autoplans a player actually has written a month */
  plansPerMonth: number;
  /** the Batch API: half price, the plan arrives minutes later */
  batch: boolean;
  /** share of autoplans (0 to 1) served from the library of plans already written, reused for a player with the same answers: no AI call. Grows as the library does */
  reuse: number;
  emailsPerDay: number;
  /** US$ per 1,000 emails */
  emailPer1000: number;
  /** the payment provider's cut of each payment */
  feePercent: number;
  feeFixed: number;
  /** payments a year: 1 on a yearly plan, 12 on a monthly one, each with its fixed fee. Default 1 */
  payments?: number;
  /** US$ a player a year */
  hosting: number;
}

/** Payment providers' standard card rates. Check the provider's page before relying on them. */
export const PAYMENT_PROVIDERS = {
  stripe: { label: "Stripe (2.9% + 30¢)", percent: 2.9, fixed: 0.3 },
  paddle: { label: "Paddle (5% + 50¢, handles tax)", percent: 5, fixed: 0.5 },
} as const;

export interface PlayerYear {
  perPlan: number;
  ai: number;
  email: number;
  fee: number;
  hosting: number;
  total: number;
  /** price minus total; negative is a loss */
  left: number;
  /** autoplans a month at which the year costs exactly the price */
  breakEvenPlansPerMonth: number;
}

/** One player's year on one model. attunr's AI writes every autoplan. */
export function playerYear(t: Pick<PlanTokens, "model" | "input" | "output">, a: Assumptions): PlayerYear {
  const perPlan = (requestCost(t.model, t.input, t.output) ?? 0) * (a.batch ? 0.5 : 1);
  const written = 1 - a.reuse;
  // with any reuse, Haiku decides for every autoplan, reused or written
  const each = perPlan * written + (a.reuse > 0 ? pickCost() : 0);
  const ai = each * a.plansPerMonth * 12;
  const email = (a.emailsPerDay * 365 * a.emailPer1000) / 1000;
  const fee = a.price > 0 ? (a.price * a.feePercent) / 100 + a.feeFixed * (a.payments ?? 1) : 0;
  const total = ai + email + fee + a.hosting;
  const rest = a.price - email - fee - a.hosting;
  return { perPlan, ai, email, fee, hosting: a.hosting, total, left: a.price - total, breakEvenPlansPerMonth: each > 0 ? Math.max(0, rest / (each * 12)) : Infinity };
}

export interface AtScale { revenue: number; variable: number; fixed: number; profit: number; /** players whose margin pays the fixed costs; null when each player loses money */ playersToCoverFixed: number | null }

/** A year with `players` paying players and `fixedMonthly` US$ of running costs that don't grow with them (hosting plan, database, email plan). */
export function atScale(y: PlayerYear, price: number, players: number, fixedMonthly: number): AtScale {
  const revenue = price * players;
  const variable = y.total * players;
  const fixed = fixedMonthly * 12;
  return { revenue, variable, fixed, profit: revenue - variable - fixed, playersToCoverFixed: y.left > 0 ? Math.ceil(fixed / y.left) : null };
}

/** What a plan of `features/account/plans.ts` needs here; kept local so the cost model takes any plan-like row. */
export interface PlanOffer {
  priceCents: number;
  period: "month" | "year";
  autoplansPerMonth: number;
  batch: boolean;
}

export interface PlanYearResult {
  /** US$ a year */
  revenue: number;
  /** one autoplan on `model`, Batch API applied; null when the model has no measured runs */
  perPlan: number | null;
  ai: number;
  fee: number;
  email: number;
  total: number;
  left: number;
  /** left ÷ revenue; 0 to 1, negative is a loss */
  margin: number;
}

/**
 * One account's year on a plan, using `usage` (0 to 1) of its autoplan allowance, every autoplan written by `model` (every
 * plan uses `SUBSCRIPTION_MODEL`). A monthly plan is twelve payments, so twelve fixed fees. AI notes spend the same
 * allowance as autoplans and are costed as autoplans. `reuse` (0 to 1) of those autoplans come from the library of plans
 * already written and cost no AI but Haiku's decide call (`PICK_TOKENS`), which every autoplan makes when any are reused.
 */
export function planYear(plan: PlanOffer, model: string, tokens: PlanTokens[], usage: number, fee: { percent: number; fixed: number }, emailsPerDay = 1, emailPer1000 = 0.4, reuse = 0): PlanYearResult {
  const payments = plan.period === "month" ? 12 : 1;
  const revenue = (plan.priceCents / 100) * payments;
  const t = tokens.find((x) => x.model === model);
  const raw = t ? requestCost(t.model, t.input, t.output) : null;
  const perPlan = raw === null ? null : raw * (plan.batch ? 0.5 : 1);
  const each = (perPlan ?? 0) * (1 - reuse) + (reuse > 0 ? pickCost() : 0);
  const ai = each * plan.autoplansPerMonth * usage * 12;
  const feeYear = revenue > 0 ? (revenue * fee.percent) / 100 + fee.fixed * payments : 0;
  const email = (emailsPerDay * 365 * emailPer1000) / 1000;
  const total = ai + feeYear + email;
  return { revenue, perPlan, ai, fee: feeYear, email, total, left: revenue - total, margin: revenue > 0 ? (revenue - total) / revenue : 0 };
}
