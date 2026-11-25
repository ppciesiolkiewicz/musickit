/**
 * What running attunr costs a month whatever the number of accounts, for /dev/costs: each service at its list price,
 * one seat or user, checked on `FIXED_COSTS_CHECKED`. Usage past a plan's allowance is not here. Check each page before
 * relying on it.
 */

export const FIXED_COSTS_CHECKED = "2026-11-15";

export interface FixedCost {
  id: string;
  label: string;
  /** US$ a month */
  monthly: number;
  /** what the price buys, and when it can be left out */
  note: string;
  /** counted when the page opens */
  on: boolean;
}

export const FIXED_COSTS: FixedCost[] = [
  { id: "vercel", label: "Vercel Pro", monthly: 20, note: "Hosting, one seat, with $20 of usage included. Hobby is free but not for a business.", on: true },
  { id: "supabase", label: "Supabase Pro", monthly: 25, note: "The database, with $10 of compute included (one Micro instance).", on: true },
  { id: "resend", label: "Resend Pro", monthly: 20, note: "50,000 emails a month. Free up to 3,000 (100 a day): about 100 accounts at one email a day.", on: true },
  { id: "workspace", label: "Google Workspace Business Starter", monthly: 7, note: "One user, paid yearly; $8.40 paid monthly. Business email at the domain.", on: true },
  { id: "domain", label: "Domain", monthly: 1.25, note: "About $15 a year.", on: true },
  { id: "posthog", label: "PostHog", monthly: 0, note: "Free up to 1 million events a month.", on: true },
  { id: "elevenlabs", label: "ElevenLabs Starter", monthly: 6, note: "Only for the dev sampler and the intro voice. Leave out while they stay tools for us.", on: false },
];

/** US$ a month of the costs switched on. */
export const fixedTotal = (on: ReadonlySet<string>, costs: readonly FixedCost[] = FIXED_COSTS): number =>
  costs.reduce((s, c) => s + (on.has(c.id) ? c.monthly : 0), 0);
