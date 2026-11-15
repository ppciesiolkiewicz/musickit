import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Assessment } from "../model/assess";
import { listAssessments, saveAssessment } from "./assessments";

const one = (candidateId: string, referenceId: string): Assessment => ({ candidateId, referenceId, persona: "p", at: "2026-11-15T10:00:00.000Z", judge: "claude-fable-5-2", durationMs: 1 });

test("an assessment is kept under the judged run's id, and a newer one replaces it", async () => {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), "devtools-assess-")), "assessments");
  assert.deepEqual(await listAssessments(dir), []);
  await saveAssessment(one("2026-11-15T10-00-00-aaaa", "2026-11-15T09-00-00-rrrr"), dir);
  await saveAssessment(one("2026-11-15T10-00-00-aaaa", "2026-11-15T11-00-00-ssss"), dir);
  await saveAssessment(one("2026-11-15T10-00-00-bbbb", "2026-11-15T11-00-00-ssss"), dir);
  writeFileSync(path.join(dir, "2026-11-15T10-00-00-cccc.json"), "{ broken");
  assert.deepEqual((await listAssessments(dir)).map((a) => [a.candidateId, a.referenceId]), [
    ["2026-11-15T10-00-00-aaaa", "2026-11-15T11-00-00-ssss"],
    ["2026-11-15T10-00-00-bbbb", "2026-11-15T11-00-00-ssss"],
  ]);
  await assert.rejects(saveAssessment(one("../escape", "x"), dir));
});
