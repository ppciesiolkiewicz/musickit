import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RunRecord } from "../model/history";
import { currentVersions, listRuns, readRun, saveRun } from "./history";

const record = (id: string, at: string): RunRecord => ({
  id, at, mode: "first", model: "haiku", answers: null, overrides: {}, parts: [], prompt: "p", reply: "r", durationMs: 1,
});

test("saved runs list newest first and read back whole", async () => {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), "devtools-history-")), "nested");
  const a = record("2026-10-30T10-00-00-aaaa", "2026-10-30T10:00:00.000Z");
  const b = record("2026-10-31T10-00-00-bbbb", "2026-10-31T10:00:00.000Z");
  await saveRun(a, dir);
  await saveRun(b, dir);
  writeFileSync(path.join(dir, "2026-10-31T11-00-00-cccc.json"), "{ broken");
  assert.deepEqual((await listRuns(dir)).map((r) => r.id), [b.id, a.id]);
  assert.deepEqual(await readRun(a.id, dir), { ...a, versions: currentVersions() });
});

test("a run is stamped with the versions in the code, unless it carries its own", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "devtools-history-"));
  const own = { prompt: 0, agents: 1, teaching: 2 };
  await saveRun({ ...record("2026-10-30T10-00-00-aaaa", "2026-10-30T10:00:00.000Z"), versions: own }, dir);
  assert.deepEqual((await readRun("2026-10-30T10-00-00-aaaa", dir))?.versions, own);
  const v = currentVersions();
  assert.ok(v.prompt >= 1 && v.agents >= 2 && v.teaching >= 5);
});

test("readRun never leaves the folder and misses quietly", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "devtools-history-"));
  const dir = path.join(root, "runs");
  mkdirSync(dir);
  writeFileSync(path.join(root, "x.json"), "{}");
  for (const id of ["../x", "", "2026-01-01T00-00-00-zzzz", "x"]) assert.equal(await readRun(id, dir), null);
});

test("no history folder yet: an empty list", async () => {
  assert.deepEqual(await listRuns(path.join(tmpdir(), "devtools-history-missing-xyz")), []);
});
