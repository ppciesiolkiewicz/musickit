import type { EarlyTaken } from "../pricing";

/**
 * How many schools and students have taken the early price: asked only by /kickstarter (its
 * countdown of founding partners) and `GET /api/early-price`. It closes no price: the plan cards and Checkout follow
 * `earlyPriceOn` (server/paymentsEnabled.ts). Typed in by hand until payments count them: raise `schools`
 * when a founding partner joins.
 */
export async function earlyTaken(): Promise<EarlyTaken> {
  return { schools: 2, students: 7 };
}
