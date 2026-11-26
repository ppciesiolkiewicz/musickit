/**
 * Puts the stand-in videos (src/features/library/seed/videos, one per scripted tool) into content_videos at DATABASE_URL:
 * each at the levels of its tool no other video holds, never taking one off a recorded video. One already stored is kept.
 * Running it again changes nothing. Rules: `seedStandIns` in src/features/contentVideos/server/standIns.ts.
 *
 *   npm run -s db:seed-videos
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db/client";
import type { StandInSeed } from "../src/features/contentVideos/model/standIn";
import { drizzleContentVideoRepo } from "../src/features/contentVideos/server/repo.drizzle";
import { seedStandIns } from "../src/features/contentVideos/server/standIns";

const DIR = path.join(__dirname, "../src/features/library/seed/videos");

async function main() {
  const url = process.env.DATABASE_URL;
  const db = getDb();
  if (!url || !db) throw new Error("DATABASE_URL is not set.");
  console.log(`Writing to ${new URL(url).host}`);
  const seeds = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as StandInSeed);
  const out = await seedStandIns(drizzleContentVideoRepo(db), seeds, new Date());
  for (const o of out) console.log(`${o.did.padEnd(8)} ${o.tool}${o.did === "added" ? `  (${o.steps === null ? "the tool" : `${o.steps.length} levels`})` : ""}`);
  const n = (did: string) => out.filter((o) => o.did === did).length;
  console.log(`${n("added")} added, ${n("kept")} already there, ${n("covered")} with every level recorded, ${n("taken") + n("bad")} not written.`);
  if (n("taken") + n("bad")) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
