/**
 * Puts the plan examples (src/features/plan/examples/plans, the prompt's and the demos', each under its example id) and
 * the seed plans (src/features/library/seed/plans, one file each) into the practice_plans library at DATABASE_URL,
 * enabled for reuse. A plan already there gets its title, source, answers, model, reply and versions refreshed; its
 * enabled_for_reuse is left as it is, so a plan turned off in the database stays off.
 *
 *   npm run -s db:seed-plans
 */
import { sql } from "drizzle-orm";
import { exampleLibraryRows, seedLibraryRows } from "../src/features/devtools/model/library";
import { getDb } from "../src/lib/db/client";
import { practicePlans } from "../src/lib/db/schema";

async function main() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set.");
  const rows = [...exampleLibraryRows(), ...seedLibraryRows()];
  if (!rows.length) {
    console.log("No plans to seed.");
    return;
  }
  await db
    .insert(practicePlans)
    .values(rows)
    .onConflictDoUpdate({ target: practicePlans.id, set: { title: sql`excluded.title`, source: sql`excluded.source`, answers: sql`excluded.answers`, model: sql`excluded.model`, reply: sql`excluded.reply`, promptVersion: sql`excluded.prompt_version`, docsAgents: sql`excluded.docs_agents`, docsTeaching: sql`excluded.docs_teaching` } });
  for (const r of rows) console.log(`seeded  ${r.id}  ${r.title}`);
  console.log(`${rows.length} plan${rows.length === 1 ? "" : "s"} in practice_plans.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
