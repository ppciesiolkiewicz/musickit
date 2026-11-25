/**
 * Puts the seed block files (src/features/library/seed/blocks) into the block library at DATABASE_URL as curated blocks
 * (`blocks.kind` 'curated', the file's id), owned by the app (no user), `seed`, each with its choices in `choices`. The
 * file is the source of truth: a block's content, tags, slot and provenance are overwritten, a choice is upserted by id,
 * and a choice no longer in its file (or of a file removed) is made inactive, never deleted. Running it again
 * changes nothing. A block already stored whose file changed (its exercise or any choice) gets `blocks.revision` one
 * higher; a new block starts at 1 and an unchanged one keeps its revision. A riff saved in the riff maker
 * (`blocks.riff_edit`) is kept over its file's riff and printed (`riff kept`); `npm run db:pull-riffs` writes it into the file. If a block file doesn't parse it writes nothing, names the file and exits 1: seeding without it would
 * make its choices inactive.
 *
 *   npm run -s db:seed-blocks
 *
 * The seed plans are not stored: they stay files (src/features/library/seed/plans).
 */
import { getDb } from "../src/lib/db/client";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { seedBlocks } from "../src/features/userData/server/seedBlocks";
import { keptRiff } from "../src/features/devtools/riff/blocks";

const s = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  const r = await seedBlocks(drizzleUserDataRepo(db), new Date(), { log: (line) => console.log(line), keepRiff: keptRiff });
  if (r.skipped.length) {
    console.error(`Nothing written: ${s(r.skipped.length, "block file")} did not parse (${r.skipped.join(", ")}). Fix ${r.skipped.length === 1 ? "it" : "them"} and run again.`);
    process.exit(1);
  }
  console.log(
    `${s(r.blocks, "curated block")} (${r.revised} changed since the last run and given a new revision), ${s(r.choices, "choice")}, ${s(r.deactivated, "choice")} made inactive${r.keptRiffs.length ? `, ${s(r.keptRiffs.length, "riff")} kept as saved in the app` : ""}${r.droppedVideos.length ? `, ${s(r.droppedVideos.length, "cell video")} dropped` : ""}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
