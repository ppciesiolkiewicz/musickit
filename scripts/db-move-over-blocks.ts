/**
 * One-off: gives existing ratings and day-timer records their block ids. For every player with a plan document at
 * DATABASE_URL, the document's blocks go in the library, then `progress_entries.block_id` and `plan_day_times.blocks`
 * are filled from the document (`moveOverUser`). Only those columns are written; nothing is deleted. Rows whose plan is
 * gone keep no block id. Safe to run again: a second run changes nothing.
 *
 *   npm run -s db:move-over-blocks
 *
 * A player whose move-over throws is printed with the error and skipped; the run ends with how many failed and exits
 * non-zero if any did. Prints the database host first. Running it on the release database is the owner's call.
 */
import { getDb } from "../src/lib/db/client";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { moveOverUser } from "../src/features/userData/server/moveOver";

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  const repo = drizzleUserDataRepo(db);
  const now = new Date();
  const total = { users: 0, blocks: 0, entries: 0, days: 0 };
  let failed = 0;
  for (const userId of await repo.planUserIds()) {
    // one player's broken data must not stop the run: report it and go on; a second run picks up where this one left off
    try {
      const c = await moveOverUser(repo, userId, now);
      console.log(`${userId}  blocks ${c.blocks}  entries ${c.entries}  days ${c.days}`);
      total.users++;
      total.blocks += c.blocks;
      total.entries += c.entries;
      total.days += c.days;
    } catch (e) {
      failed++;
      console.error(`${userId}  failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`${total.users} player${total.users === 1 ? "" : "s"}: blocks ${total.blocks}, entries ${total.entries}, days ${total.days}.`);
  if (failed) {
    console.error(`${failed} player${failed === 1 ? "" : "s"} failed; run it again once fixed.`);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
