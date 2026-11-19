/**
 * Puts the blocks of every practice_plans reply and of the seed block files (src/features/library/seed/blocks) into the
 * block library at DATABASE_URL, owned by the app (no user), `seed`, enabled for reuse. A block an earlier run stored as
 * an example's (`example`, not enabled) is promoted to `seed`, enabled. Each block takes its plan's or its file's model
 * and versions, and each plan's blocks go in practice_plan_blocks. Blocks are only inserted and provenance filled once,
 * so running it again adds nothing.
 *
 *   npm run -s db:seed-blocks
 *
 * Run db:seed-plans first so practice_plans has the plans.
 */
import { practicePlans } from "../src/lib/db/schema";
import { getDb } from "../src/lib/db/client";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { seedBlocks, unparsedReplies, type SeedPlan } from "../src/features/userData/server/seedBlocks";

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  console.log("reading practice_plans…");
  const rows = await db
    .select({ id: practicePlans.id, reply: practicePlans.reply, model: practicePlans.model, promptVersion: practicePlans.promptVersion, docsAgents: practicePlans.docsAgents, docsTeaching: practicePlans.docsTeaching })
    .from(practicePlans)
    .orderBy(practicePlans.id);
  const plans: SeedPlan[] = rows.map((r) => ({ id: r.id, reply: r.reply, provenance: { model: r.model, promptVersion: r.promptVersion, docsAgents: r.docsAgents, docsTeaching: r.docsTeaching } }));
  console.log(`${rows.length} plans read; parsing replies and seed files…`);
  const replies = plans.map((p) => p.reply);
  for (const i of unparsedReplies(replies)) console.log(`skipped  ${rows[i].id}  (reply does not parse)`);
  const { library, planBlocks, promoted } = await seedBlocks(drizzleUserDataRepo(db), plans, new Date(), undefined, (line) => console.log(line));
  console.log(`${library} library block${library === 1 ? "" : "s"} from ${rows.length} plan${rows.length === 1 ? "" : "s"} and the seed block files, ${planBlocks} plan block row${planBlocks === 1 ? "" : "s"}, ${promoted} example block${promoted === 1 ? "" : "s"} promoted to seed.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
