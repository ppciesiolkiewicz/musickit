/**
 * What the business is worth over time, for "Over time" on /admin/dev/costs: month by month, new trials, the share that pays,
 * monthly payers who leave and yearly payers who renew, against what each account costs us. A projection from the
 * numbers on the page, not a forecast.
 */

/** Starting plan mix for n plans `startMix` doesn't know, in `sort` order, in percent: 70 on the first, the rest shared out, fewer on each dearer one. */
export const startShares = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => (n === 1 ? 100 : i === 0 ? 70 : Math.round((30 * 2 ** (n - 1 - i)) / (2 ** (n - 1) - 1))));

/**
 * The starting plan mix by plan id, in percent (set 2026-11-15): most payers on Student. Used when every plan is one of these; any other set of plans starts from `startShares`.
 */
export const START_MIX: Record<string, number> = { student: 73, "teacher-basic": 18, "teacher-pro": 9 };

/** Starting plan mix for these plans, in `sort` order, in percent. */
export const startMix = (ids: string[]): number[] => (ids.every((id) => id in START_MIX) ? ids.map((id) => START_MIX[id]) : startShares(ids.length));

/** One plan as the projection needs it. */
export interface GrowthPlan {
  id: string;
  /** US$ a month, paid monthly */
  month: number;
  /** US$ a year, paid yearly */
  year: number;
  trialDays: number;
  /** share (0 to 1) of new paying accounts that choose this plan; the shares are normalised to 1 */
  share: number;
  /** US$ a month one active account on it costs us: AI and emails. A trial that doesn't pay costs it for its days */
  costPerMonth: number;
}

export interface GrowthInputs {
  months: number;
  /** trials started in the first month */
  trialsStart: number;
  /** growth of trials started, each month (0.05 is 5%) */
  growth: number;
  /** share (0 to 1) of trials that pay */
  conversion: number;
  /** share (0 to 1) of payers who pay yearly */
  yearlyShare: number;
  /** share (0 to 1) of monthly payers who leave each month */
  monthlyChurn: number;
  /** share (0 to 1) of yearly payers who pay again at the end of a year */
  yearlyRenewal: number;
  fee: { percent: number; fixed: number };
  /** US$ a month that doesn't grow with accounts: hosting plan, database, email plan */
  fixedMonthly: number;
}

export interface GrowthMonth {
  /** 1 for the first month */
  month: number;
  trials: number;
  /** paying accounts at the end of the month */
  monthly: number;
  yearly: number;
  /** monthly recurring revenue: monthly payers' price plus a twelfth of yearly payers' */
  mrr: number;
  /** payments taken this month, before fees */
  cashIn: number;
  /** AI and running costs of accounts and trials, payment fees and fixed costs */
  costs: number;
  /** cashIn − costs */
  profit: number;
  /** profit to date */
  cumulative: number;
}

const feeOf = (price: number, fee: GrowthInputs["fee"]) => (price > 0 ? (price * fee.percent) / 100 + fee.fixed : 0);

/**
 * The projection. Trials that pay start paying in the month they began (a trial is shorter than a month). A monthly
 * payer pays every month until they leave; a yearly payer pays at the start of each year they stay.
 */
export function project(plans: GrowthPlan[], g: GrowthInputs): GrowthMonth[] {
  const total = plans.reduce((s, p) => s + Math.max(0, p.share), 0);
  const mix = plans.map((p) => ({ p, w: total > 0 ? Math.max(0, p.share) / total : 1 / plans.length }));
  const monthly = mix.map(() => 0);
  /** yearly cohorts per plan: [start month index, accounts still paying] */
  const cohorts: [number, number][][] = mix.map(() => []);
  const out: GrowthMonth[] = [];
  let cumulative = 0;

  for (let t = 0; t < g.months; t++) {
    const trials = g.trialsStart * (1 + g.growth) ** t;
    const payers = trials * g.conversion;
    let cashIn = 0, costs = g.fixedMonthly, mrr = 0, mCount = 0, yCount = 0;
    mix.forEach(({ p, w }, i) => {
      // a trial that pays is costed as a paying account this month; one that doesn't, for its days
      costs += (trials - payers) * w * p.costPerMonth * (p.trialDays / 30);
      monthly[i] = monthly[i] * (1 - g.monthlyChurn) + payers * w * (1 - g.yearlyShare);
      for (const c of cohorts[i]) if ((t - c[0]) % 12 === 0) c[1] *= g.yearlyRenewal;
      cohorts[i].push([t, payers * w * g.yearlyShare]);
      const paying = cohorts[i].filter((c) => (t - c[0]) % 12 === 0).reduce((s, c) => s + c[1], 0);
      const yearly = cohorts[i].reduce((s, c) => s + c[1], 0);
      cashIn += monthly[i] * p.month + paying * p.year;
      costs += (monthly[i] + yearly) * p.costPerMonth + monthly[i] * feeOf(p.month, g.fee) + paying * feeOf(p.year, g.fee);
      mrr += monthly[i] * p.month + (yearly * p.year) / 12;
      mCount += monthly[i];
      yCount += yearly;
    });
    const profit = cashIn - costs;
    cumulative += profit;
    out.push({ month: t + 1, trials, monthly: mCount, yearly: yCount, mrr, cashIn, costs, profit, cumulative });
  }
  return out;
}

/**
 * What one paying account brings in over its life, after its costs and fees: monthly, the margin a month over the share
 * that leaves each month; yearly, the margin a year over the share that doesn't renew. Infinity when nobody leaves.
 */
export function lifetimeValue(p: Pick<GrowthPlan, "month" | "year" | "costPerMonth">, g: Pick<GrowthInputs, "monthlyChurn" | "yearlyRenewal" | "fee">): { monthly: number; yearly: number } {
  const perMonth = p.month - feeOf(p.month, g.fee) - p.costPerMonth;
  const perYear = p.year - feeOf(p.year, g.fee) - 12 * p.costPerMonth;
  return {
    monthly: g.monthlyChurn > 0 ? perMonth / g.monthlyChurn : Infinity,
    yearly: g.yearlyRenewal < 1 ? perYear / (1 - g.yearlyRenewal) : Infinity,
  };
}
