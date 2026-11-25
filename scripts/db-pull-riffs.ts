/**
 * Writes the riffs saved in the riff maker (/admin/content/riff, `blocks.riff_edit` at DATABASE_URL) into their seed
 * block files (src/features/library/seed/blocks), with `withRiff`: the key, scale, notes, tempo (a tempo range in
 * `moves` moves with it) and amp; every other line of the file stays. A file that already holds its riff is left.
 * `riff_edited_at` stays set, so the seed keeps the same riff either way. Run it in development, then commit the files.
 *
 *   npm run -s db:pull-riffs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "../src/lib/db/client";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import { blockFileText, keptRiff } from "../src/features/devtools/riff/blocks";

const BLOCKS = path.join(process.cwd(), "src/features/library/seed/blocks");

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Reading riffs saved in the app from ${new URL(url).host}`);
  const edits = await drizzleUserDataRepo(db).riffEdits();
  let wrote = 0;
  let problems = 0;
  for (const e of edits) {
    const file = path.join(BLOCKS, `${e.blockId}.json`);
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      console.error(`no file  ${e.blockId}  (no seed block file has this id; nothing written)`);
      problems++;
      continue;
    }
    const kept = keptRiff(JSON.parse(text), e.edit);
    if (!kept) {
      console.error(`not written  ${e.blockId}  (the riff saved in the app can't be read, or the file holds no riff)`);
      problems++;
      continue;
    }
    const next = blockFileText(kept);
    if (next === text) {
      console.log(`in file  ${e.blockId}`);
      continue;
    }
    await writeFile(file, next);
    wrote++;
    console.log(`wrote  ${e.blockId}  (saved in the app ${e.at.toISOString().slice(0, 10)}${e.byName ? ` by ${e.byName}` : ""})`);
  }
  console.log(`${edits.length} riff${edits.length === 1 ? "" : "s"} saved in the app, ${wrote} written into ${wrote === 1 ? "its file" : "their files"}${problems ? `, ${problems} not written` : ""}.`);
  if (problems) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
