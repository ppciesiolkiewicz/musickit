import { getDb } from "@/lib/db/client";
import { choosablePlans, type Plan } from "../plans";
import { drizzleRepo } from "./repo.drizzle";

/** How long a public page waits for the plans before it shows its pricing without numbers. */
const TIMEOUT_MS = 8000;

/**
 * The plans anyone can choose, in `sort` order, for a public page (the Pricing section of / and /players): the same rows
 * /dev/kickstarter/teachers and /dev/costs list, so a home page never quotes a price the plans table doesn't hold.
 * Null with no database, or when it doesn't answer in time: the page then shows its pricing without numbers.
 */
export async function publicPlans(): Promise<Plan[] | null> {
  const db = getDb();
  if (!db) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("the plans table did not answer in time")), TIMEOUT_MS); });
    return choosablePlans(await Promise.race([drizzleRepo(db).listPlans(), late]), null);
  } catch (e) {
    console.error("publicPlans:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
