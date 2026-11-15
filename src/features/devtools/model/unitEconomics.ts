import type { DevModel } from "./models";
import type { RunSummary } from "./history";
import { API_PRICES } from "./pricing";

/**
 * What one paying player costs a year, for /dev/kickstarter: the AI that writes their autoplans (tokens measured from the
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
  /** share of players (0 to 1) whose plans attunr's AI writes; the rest paste the prompt into their own AI, which costs nothing */
  aiShare: number;
  /** the Batch API: half price, the plan arrives minutes later */
  batch: boolean;
  emailsPerDay: number;
  /** US$ per 1,000 emails */
  emailPer1000: number;
  /** the payment provider's cut of the yearly payment */
  feePercent: number;
  feeFixed: number;
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

/** One player's year on one model. */
export function playerYear(t: Pick<PlanTokens, "model" | "input" | "output">, a: Assumptions): PlayerYear {
  const perPlan = (requestCost(t.model, t.input, t.output) ?? 0) * (a.batch ? 0.5 : 1);
  const ai = perPlan * a.plansPerMonth * 12 * a.aiShare;
  const email = (a.emailsPerDay * 365 * a.emailPer1000) / 1000;
  const fee = a.price > 0 ? (a.price * a.feePercent) / 100 + a.feeFixed : 0;
  const total = ai + email + fee + a.hosting;
  const rest = a.price - email - fee - a.hosting;
  return { perPlan, ai, email, fee, hosting: a.hosting, total, left: a.price - total, breakEvenPlansPerMonth: perPlan > 0 && a.aiShare > 0 ? Math.max(0, rest / (perPlan * 12 * a.aiShare)) : Infinity };
}

export interface AtScale { revenue: number; variable: number; fixed: number; profit: number; /** players whose margin pays the fixed costs; null when each player loses money */ playersToCoverFixed: number | null }

/** A year with `players` paying players and `fixedMonthly` US$ of running costs that don't grow with them (hosting plan, database, email plan). */
export function atScale(y: PlayerYear, price: number, players: number, fixedMonthly: number): AtScale {
  const revenue = price * players;
  const variable = y.total * players;
  const fixed = fixedMonthly * 12;
  return { revenue, variable, fixed, profit: revenue - variable - fixed, playersToCoverFixed: y.left > 0 ? Math.ceil(fixed / y.left) : null };
}
