/**
 * Puts the published Fable 5.2 plans (src/features/plan/modelPlans/plans.json) into the practice_plans library at
 * DATABASE_URL, enabled for reuse. A plan already there gets its title, answers and reply refreshed; its
 * enabled_for_reuse is left as it is, so a plan turned off in the database stays off.
 *
 *   npm run -s db:seed-plans
 *
 * More Fable plans: write them (npm run -s compare-models -- --models claude-fable-5-2), publish them
 * (npm run -s publish-model-plans), then run this again.
 */
import { sql } from "drizzle-orm";
import { libraryRows } from "../src/features/devtools/model/library";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { MODEL_PLANS } from "../src/features/plan/modelPlans";
import { getDb } from "../src/lib/db/client";
import { practicePlans } from "../src/lib/db/schema";

async function main() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set.");
  const rows = libraryRows(MODEL_PLANS, PERSONAS);
  if (!rows.length) {
    console.log("No published Fable plans to seed.");
    return;
  }
  await db
    .insert(practicePlans)
    .values(rows)
    .onConflictDoUpdate({ target: practicePlans.id, set: { title: sql`excluded.title`, answers: sql`excluded.answers`, model: sql`excluded.model`, reply: sql`excluded.reply` } });
  for (const r of rows) console.log(`seeded  ${r.id}  ${r.title}`);
  console.log(`${rows.length} plan${rows.length === 1 ? "" : "s"} in practice_plans.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
