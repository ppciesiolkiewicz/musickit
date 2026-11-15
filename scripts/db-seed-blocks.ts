/**
 * Puts the blocks of the exercise and plan examples (src/features/plan/examples) and of every practice_plans reply into
 * the block library at DATABASE_URL, owned by the app (no user). Library plans' blocks are `seed`, enabled for reuse;
 * the examples' are `example`, not enabled. Blocks are only inserted, so running it again adds nothing.
 *
 *   npm run -s db:seed-blocks
 *
 * Run db:seed-plans first so practice_plans has the plans.
 */
import { practicePlans } from "../src/lib/db/schema";
import { getDb } from "../src/lib/db/client";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { seedBlocks, unparsedReplies } from "../src/features/userData/server/seedBlocks";

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  const rows = await db.select({ id: practicePlans.id, reply: practicePlans.reply }).from(practicePlans);
  const replies = rows.map((r) => r.reply);
  for (const i of unparsedReplies(replies)) console.log(`skipped  ${rows[i].id}  (reply does not parse)`);
  const { library, examples } = await seedBlocks(drizzleUserDataRepo(db), replies, new Date());
  console.log(`${library} library block${library === 1 ? "" : "s"} from ${rows.length} plan${rows.length === 1 ? "" : "s"}, ${examples} example block${examples === 1 ? "" : "s"}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
