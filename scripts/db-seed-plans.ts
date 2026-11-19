/**
 * Puts the seed plans (src/features/library/seed/plans, one file each; the demos' plans among them, under the ids
 * DEMO_PLANS names) into the practice_plans library at DATABASE_URL, source "seed", enabled for reuse. A plan already there gets its title, source, answers, model, reply and versions refreshed; its
 * enabled_for_reuse is left as it is, so a plan turned off in the database stays off. The reply is the plan file with each
 * ref written out in full (`expandPlan`): the exercise of the choice it names, each carrying its `blockId` and `choiceId`.
 * If a ref names no block or choice, it writes nothing, prints the refs and exits 1.
 *
 *   npm run -s db:seed-plans
 */
import { sql } from "drizzle-orm";
import { seedLibraryRows } from "../src/features/devtools/model/library";
import { SEED_BLOCKS, SEED_PLANS } from "../src/features/library/seed";
import { expandPlan } from "../src/features/library/seed/choices";
import { getDb } from "../src/lib/db/client";
import { practicePlans } from "../src/lib/db/schema";

async function main() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set.");
  const errors = SEED_PLANS.flatMap((f) => expandPlan(f, SEED_BLOCKS).errors.map((e) => `plan ${f.id}: ${e}`));
  if (errors.length) {
    for (const e of errors) console.error(e);
    console.error(`Nothing written: ${errors.length} plan ref${errors.length === 1 ? "" : "s"} name no block or choice. Fix the plan files and run again.`);
    process.exit(1);
  }
  const rows = seedLibraryRows();
  if (!rows.length) {
    console.log("No plans to seed.");
    return;
  }
  await db
    .insert(practicePlans)
    .values(rows)
    .onConflictDoUpdate({ target: practicePlans.id, set: { title: sql`excluded.title`, source: sql`excluded.source`, answers: sql`excluded.answers`, model: sql`excluded.model`, reply: sql`excluded.reply`, promptVersion: sql`excluded.prompt_version`, docsAgents: sql`excluded.docs_agents`, docsTeaching: sql`excluded.docs_teaching` } });
  for (const f of SEED_PLANS) if (!rows.some((r) => r.id === f.id)) console.log(`skipped  ${f.id}  (does not parse)`);
  for (const r of rows) {
    const days = (JSON.parse(r.reply) as { days: { exercises: { choiceId?: string }[] }[] }).days;
    const choices = new Set(days.flatMap((d) => d.exercises.map((e) => e.choiceId)));
    console.log(`seeded  ${r.id}  ${r.title}  (${days.reduce((n, d) => n + d.exercises.length, 0)} exercises, ${choices.size} choices)`);
  }
  console.log(`${rows.length} plan${rows.length === 1 ? "" : "s"} in practice_plans.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
