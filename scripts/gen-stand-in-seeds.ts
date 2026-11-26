/**
 * Writes the stand-in video seeds (src/features/library/seed/videos, one file per tool in VIDEO_PLANS) from the scripts in
 * src/features/contentVideos/model/scripts.ts. A file keeps its id; a new one gets a fresh one. Run after a script changes:
 *   npx tsx scripts/gen-stand-in-seeds.ts
 * Only writes files: nothing puts the stand-ins in the database yet (`standIn.ts`).
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { VIDEO_PLANS } from "../src/features/contentVideos/model/scripts";
import { standInFile, standInSeed } from "../src/features/contentVideos/model/standIn";

const DIR = path.join(__dirname, "../src/features/library/seed/videos");
mkdirSync(DIR, { recursive: true });
const wanted = new Set<string>();
for (const tool of Object.keys(VIDEO_PLANS)) {
  const file = path.join(DIR, standInFile(tool));
  wanted.add(standInFile(tool));
  const old = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { id?: unknown }) : null;
  const id = typeof old?.id === "string" ? old.id : randomUUID();
  writeFileSync(file, JSON.stringify(standInSeed(tool, id), null, 2) + "\n");
}
for (const f of readdirSync(DIR)) if (f.endsWith(".json") && !wanted.has(f)) rmSync(path.join(DIR, f));
console.log(`${wanted.size} stand-in seeds in ${path.relative(process.cwd(), DIR)}`);
