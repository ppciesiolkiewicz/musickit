/**
 * Puts the seed block files (src/features/library/seed/blocks) into the block library at DATABASE_URL as curated blocks
 * (`blocks.kind` 'curated', the file's id), owned by the app (no user), `seed`, each with its choices in `choices`. The
 * file is the source of truth: a block's content, tags, slot and provenance are overwritten, a choice is upserted by id,
 * and a choice no longer in its file (or of a file removed) is made inactive, never deleted. Then each seed plan file
 * that is in practice_plans gets its practice_plan_blocks rows from its refs (block, choice, minutes). Running it again
 * changes nothing. A block already stored whose file changed (its exercise or any choice) gets `blocks.revision` one
 * higher; a new block starts at 1 and an unchanged one keeps its revision. If a block file doesn't parse it writes nothing, names the file and exits 1: seeding without it would
 * make its choices inactive.
 *
 *   npm run -s db:seed-blocks
 *
 * Run db:seed-plans first so practice_plans has the plans.
 */
import { practicePlans } from "../src/lib/db/schema";
import { getDb } from "../src/lib/db/client";
import { SEED_PLANS } from "../src/features/library/seed";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { seedBlocks } from "../src/features/userData/server/seedBlocks";

const s = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  console.log("reading practice_plans…");
  const ids = new Set((await db.select({ id: practicePlans.id }).from(practicePlans)).map((r) => r.id));
  const plans = SEED_PLANS.filter((p) => ids.has(p.id));
  for (const p of SEED_PLANS) if (!ids.has(p.id)) console.log(`skipped  plan ${p.id}  (not in practice_plans; run db:seed-plans first)`);
  console.log(`${ids.size} plans read, ${plans.length} of ${SEED_PLANS.length} seed plans among them`);
  const r = await seedBlocks(drizzleUserDataRepo(db), new Date(), { plans, log: (line) => console.log(line) });
  if (r.skipped.length) {
    console.error(`Nothing written: ${s(r.skipped.length, "block file")} did not parse (${r.skipped.join(", ")}). Fix ${r.skipped.length === 1 ? "it" : "them"} and run again.`);
    process.exit(1);
  }
  console.log(
    `${s(r.blocks, "curated block")} (${r.revised} changed since the last run and given a new revision), ${s(r.choices, "choice")}, ${s(r.deactivated, "choice")} made inactive, ${s(r.planBlocks, "plan block row")}` +
      `${r.unknownRefs.length ? `, ${s(r.unknownRefs.length, "plan ref")} naming nothing` : ""}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
