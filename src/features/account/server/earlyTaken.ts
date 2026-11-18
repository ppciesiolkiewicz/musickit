import type { EarlyTaken } from "../pricing";

/**
 * How many schools and students have taken the early price: the one count every page asks, through
 * `GET /api/early-price` or straight from a server page. Typed in by hand until payments count them: raise `schools`
 * when a founding partner joins.
 */
export async function earlyTaken(): Promise<EarlyTaken> {
  return { schools: 2, students: 7 };
}
