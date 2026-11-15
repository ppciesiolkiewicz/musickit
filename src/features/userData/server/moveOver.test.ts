import assert from "node:assert/strict";
import test from "node:test";
import { blockIdOf, blockKeyOf } from "@/features/plan/model/blockId";
import type { PlanExercise } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import { putEntry, readEntries, readPlanTimes, writePlanTime } from "./data";
import { moveOverUser } from "./moveOver";
import { memoryUserDataRepo } from "./repo.memory";

const now = new Date("2026-11-15T10:00:00Z");
const ex = { id: "s1", title: "Spider walk", minutes: 5, cells: [{ type: "text", text: "Frets 1 to 4." }], area: "guitar", tags: ["technique"] } as PlanExercise;
const ex2 = { id: "s2", title: "G major scale", minutes: 10, cells: [{ type: "text", text: "Two octaves." }], area: "guitar", tags: ["scales"] } as PlanExercise;
const ex3 = { id: "s3", title: "Chord changes", minutes: 5, cells: [{ type: "text", text: "G to C." }], area: "guitar", tags: ["chords"] } as PlanExercise;
const idOf = (e: PlanExercise) => blockIdOf(blockKeyOf(e));
const entry = (exerciseId: string, over: object = {}) => ({ id: `e-${exerciseId}`, planId: "p", exerciseId, day: 0, exercise: 0, title: "T", stars: 3, at: "2026-11-15T09:00:00Z", ...over }) as ProgressEntry;
const stored = (id: string, exercises: PlanExercise[]) => ({ id, startedOn: "2026-11-01", done: {}, config: { title: "W", days: [{ theme: "T", exercises }] } });

/** A player from before blocks: a plan document (current p, earlier p0), ratings and day times without block ids. */
async function oldPlayer() {
  const repo = memoryUserDataRepo();
  await repo.putDoc("u1", "plan", { current: stored("p", [ex, ex2]), history: [stored("p0", [ex3])] }, now);
  await repo.putProgress("u1", entry("s1"), now);
  await repo.putProgress("u1", entry("s3", { planId: "p0" }), now);
  await repo.putProgress("u1", entry("gone", { planId: "old" }), now);
  await repo.putPlanTime("u1", { planId: "p", day: 0, elapsed: 300, spent: { s1: 200, s2: 100 } }, now);
  await repo.putPlanTime("u1", { planId: "p0", day: 2, elapsed: 50, spent: { s3: 50 } }, now);
  await repo.putPlanTime("u1", { planId: "old", day: 0, elapsed: 70, spent: { gone: 70 } }, now);
  return repo;
}

test("moveOverUser fills block ids on entries and day times from the plan document", async () => {
  const repo = await oldPlayer();
  assert.deepEqual(await moveOverUser(repo, "u1", now), { blocks: 3, entries: 2, days: 2 });
  const byId = Object.fromEntries((await readEntries(repo, "u1")).map((e) => [e.exerciseId, e.blockId]));
  assert.deepEqual(byId, { s1: idOf(ex), s3: idOf(ex3), gone: undefined });
  assert.deepEqual((await readPlanTimes(repo, "u1", "p"))[0].blocks, { s1: idOf(ex), s2: idOf(ex2) });
  assert.deepEqual((await readPlanTimes(repo, "u1", "p0"))[0].blocks, { s3: idOf(ex3) });
  assert.deepEqual(new Set(repo.peekOwners().map((o) => `${o.userId} ${o.blockId}`)), new Set([ex, ex2, ex3].map((e) => `u1 ${idOf(e)}`)));
});

test("an entry whose plan is gone keeps no block id, and is not removed", async () => {
  const repo = await oldPlayer();
  await moveOverUser(repo, "u1", now);
  const gone = (await readEntries(repo, "u1")).find((e) => e.exerciseId === "gone");
  assert.ok(gone, "still there");
  assert.equal(gone.blockId, undefined);
  const [t] = await readPlanTimes(repo, "u1", "old");
  assert.deepEqual(t, { planId: "old", day: 0, elapsed: 70, spent: { gone: 70 } });
});

test("an entry or day time that already has its block is left as it is", async () => {
  const repo = await oldPlayer();
  const other = "f".repeat(32);
  await putEntry(repo, "u1", entry("s1", { blockId: other }), now);
  await writePlanTime(repo, "u1", { planId: "p", day: 0, elapsed: 300, spent: { s1: 200, s2: 100 }, blocks: { s1: other } }, now);
  assert.deepEqual(await moveOverUser(repo, "u1", now), { blocks: 3, entries: 1, days: 1 });
  assert.equal((await readEntries(repo, "u1")).find((e) => e.exerciseId === "s1")?.blockId, other);
  assert.deepEqual((await readPlanTimes(repo, "u1", "p"))[0].blocks, { s1: other });
});

test("nothing is deleted: entries, day times and documents count the same before and after", async () => {
  const repo = await oldPlayer();
  const count = async () => [
    (await repo.listProgress("u1")).length,
    (await repo.listPlanTimes("u1", "p")).length + (await repo.listPlanTimes("u1", "p0")).length + (await repo.listPlanTimes("u1", "old")).length,
    (await repo.getDoc("u1", "plan")) ? 1 : 0,
  ];
  const before = await count();
  const doc = await repo.getDoc("u1", "plan");
  await moveOverUser(repo, "u1", now);
  assert.deepEqual(await count(), before);
  assert.deepEqual(before, [3, 3, 1]);
  assert.deepEqual(await repo.getDoc("u1", "plan"), doc, "the document is not rewritten");
});

test("running it twice changes nothing the second time", async () => {
  const repo = await oldPlayer();
  await moveOverUser(repo, "u1", now);
  assert.deepEqual(await moveOverUser(repo, "u1", now), { blocks: 0, entries: 0, days: 0 });
});

test("a player without a plan document changes nothing", async () => {
  const repo = memoryUserDataRepo();
  await repo.putProgress("u1", entry("s1"), now);
  assert.deepEqual(await moveOverUser(repo, "u1", now), { blocks: 0, entries: 0, days: 0 });
  assert.equal((await readEntries(repo, "u1"))[0].blockId, undefined);
});

test("the move-over never rewrites a whole row: it does not call putProgress or putPlanTime", async () => {
  const repo = await oldPlayer();
  const guarded = {
    ...repo,
    putProgress: async () => assert.fail("putProgress called"),
    putPlanTime: async () => assert.fail("putPlanTime called"),
  };
  assert.deepEqual(await moveOverUser(guarded, "u1", now), { blocks: 3, entries: 2, days: 2 });
});

test("planUserIds lists only users with a plan document", async () => {
  const repo = memoryUserDataRepo();
  await repo.putDoc("u1", "plan", { current: null, history: [] }, now);
  await repo.putDoc("u2", "note", "hi", now);
  await repo.putProgress("u3", entry("s1"), now);
  await repo.putDoc("u4", "plan", { current: stored("p", [ex]), history: [] }, now);
  await repo.putDoc("u4", "note", "hi", now);
  assert.deepEqual((await repo.planUserIds()).sort(), ["u1", "u4"]);
});
