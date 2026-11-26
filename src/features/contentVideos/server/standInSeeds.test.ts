import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isVideoId } from "@/features/videos/server/rules";
import { VIDEO_PLANS } from "../model/scripts";
import { standInFile, standInSeed, type StandInSeed } from "../model/standIn";

const DIR = path.join(process.cwd(), "src/features/library/seed/videos");
const REGEN = "out of step with scripts.ts: run npx tsx scripts/gen-stand-in-seeds.ts";

test("one stand-in seed per scripted tool, each as its script writes it", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  assert.deepEqual(files, Object.keys(VIDEO_PLANS).map(standInFile).sort(), REGEN);
  const ids = new Set<string>();
  for (const tool of Object.keys(VIDEO_PLANS)) {
    const seed = JSON.parse(readFileSync(path.join(DIR, standInFile(tool)), "utf8")) as StandInSeed;
    assert.ok(isVideoId(seed.id), `${tool}: id`);
    assert.ok(!ids.has(seed.id), `${tool}: id taken`);
    ids.add(seed.id);
    assert.deepEqual(seed, standInSeed(tool, seed.id), `${tool}: ${REGEN}`);
  }
});
