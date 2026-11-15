import assert from "node:assert/strict";
import test from "node:test";
import { putEntry, readDoc, readEntries, readPlanTimes, writeDoc, writePlanTime } from "./data";
import { memoryUserDataRepo } from "./repo.memory";

const now = new Date("2026-11-15T10:00:00Z");
const entry = (over: object = {}) => ({ id: "e1", planId: "p", exerciseId: "x1", day: 0, exercise: 0, title: "T", stars: 3, at: "2026-11-15T10:00:00Z", ...over });

test("writeDoc refuses a document over the cap", async () => {
  const repo = memoryUserDataRepo();
  assert.deepEqual(await writeDoc(repo, "u1", "note", "x".repeat(600 * 1024), now), { ok: false, error: "too-big" });
  assert.deepEqual(await writeDoc(repo, "u1", "looper", {}, now), { ok: false, error: "bad-kind" });
});

test("writeDoc takes a plan up to 2 MB, and refuses one over it", async () => {
  const repo = memoryUserDataRepo();
  const plan = (feedback: string) => ({ current: { id: "p", startedOn: "2026-11-01", done: {}, feedback, config: { title: "W", days: [] } }, history: [] });
  assert.deepEqual(await writeDoc(repo, "u1", "plan", plan("x".repeat(1024 * 1024)), now), { ok: true });
  assert.deepEqual(await writeDoc(repo, "u1", "plan", plan("x".repeat(2 * 1024 * 1024)), now), { ok: false, error: "too-big" });
});

test("a written plan reads back sanitised", async () => {
  const repo = memoryUserDataRepo();
  assert.deepEqual(await writeDoc(repo, "u1", "plan", { current: "junk", reminder: { enabled: 1, time: "bad" }, extra: 1 }, now), { ok: true });
  const plan = (await readDoc(repo, "u1", "plan")) as { current: unknown; history: unknown[]; reminder: { enabled: boolean } };
  assert.equal(plan.current, null);
  assert.deepEqual(plan.history, []);
  assert.equal(plan.reminder.enabled, true);
  assert.equal("extra" in plan, false);
});

test("two players' documents never cross", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "creator", { family: 0, mode: 1, tonicPc: 5 }, now);
  assert.equal(await repo.getDoc("u2", "creator"), null);
  assert.deepEqual(await readDoc(repo, "u2", "creator"), { tonicPc: null, family: 0, mode: 0 });
  await putEntry(repo, "u1", entry(), now);
  assert.deepEqual(await repo.listProgress("u2"), []);
});

test("putEntry twice for one exercise leaves one row; a broken entry is refused", async () => {
  const repo = memoryUserDataRepo();
  assert.equal(await putEntry(repo, "u1", entry(), now), true);
  assert.equal(await putEntry(repo, "u1", entry({ stars: 5 }), now), true);
  const rows = await repo.listProgress("u1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stars, 5);
  assert.equal(await putEntry(repo, "u1", {}, now), false);
  await repo.removeProgress("u1", "x1");
  assert.deepEqual(await repo.listProgress("u1"), []);
});

test("readEntries drops broken rows and keeps one per exercise", async () => {
  const repo = memoryUserDataRepo();
  await repo.putProgress("u1", entry() as never, now);
  await repo.putProgress("u1", { id: "bad", exerciseId: "x2" } as never, now);
  const rows = await readEntries(repo, "u1");
  assert.deepEqual(rows.map((r) => r.exerciseId), ["x1"]);
});

test("writePlanTime keeps one record per plan and day, apart from the plan; a broken one is refused", async () => {
  const repo = memoryUserDataRepo();
  const t = { planId: "p", day: 1, elapsed: 120, spent: { a: 100, b: 20 } };
  assert.equal(await writePlanTime(repo, "u1", t, now), true);
  assert.equal(await writePlanTime(repo, "u1", { ...t, elapsed: 130 }, now), true);
  assert.equal(await writePlanTime(repo, "u1", { ...t, day: 2 }, now), true);
  assert.equal(await writePlanTime(repo, "u1", { ...t, planId: "other" }, now), true);
  assert.deepEqual(await readPlanTimes(repo, "u1", "p"), [{ ...t, elapsed: 130 }, { ...t, day: 2 }]);
  assert.equal(await repo.getDoc("u1", "plan"), null, "no plan document is made");
  assert.equal(await writePlanTime(repo, "u1", { ...t, day: 9 }, now), false);
  assert.deepEqual(await readPlanTimes(repo, "u2", "p"), [], "another player's are never read");
  repo.cascadeUser("u1");
  assert.deepEqual(await readPlanTimes(repo, "u1", "p"), []);
});
