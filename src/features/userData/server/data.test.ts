import assert from "node:assert/strict";
import test from "node:test";
import { blockIdOf, blockKeyOf } from "@/features/plan/model/blockId";
import { EMPTY_STATE, type PlanExercise, type PlanState } from "@/features/plan/model/types";
import { putEntry, readDoc, readDocVersioned, readEntries, readOwnDocVersioned, readAllPlanTimes, readPlanTimes, storePlanBlocks, writeDoc, writePlanTime } from "./data";
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
  assert.deepEqual(await writeDoc(repo, "u1", "plan", plan("x".repeat(1024 * 1024)), now), { ok: true, version: 1 });
  assert.deepEqual(await writeDoc(repo, "u1", "plan", plan("x".repeat(2 * 1024 * 1024)), now), { ok: false, error: "too-big" });
});

test("a written plan reads back sanitised", async () => {
  const repo = memoryUserDataRepo();
  assert.deepEqual(await writeDoc(repo, "u1", "plan", { current: "junk", reminder: { enabled: 1, time: "bad" }, extra: 1 }, now), { ok: true, version: 1 });
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

// --- the block library, filled when a plan is saved

const ex = { id: "s1", title: "Spider walk", minutes: 5, cells: [{ type: "text", text: "Frets 1 to 4." }], area: "guitar", tags: ["technique"] } as PlanExercise;
const ex2 = { id: "s2", title: "G major scale", minutes: 10, cells: [{ type: "text", text: "Two octaves." }], area: "guitar", tags: ["scales"] } as PlanExercise;
const idOf = (e: PlanExercise) => blockIdOf(blockKeyOf(e));
const planDoc = (exercises: object[], history: object[] = []) => ({
  current: { id: "p", startedOn: "2026-11-01", done: {}, config: { title: "W", days: [{ theme: "T", exercises }] } },
  history,
});

test("writing a plan puts its blocks in the library, owned by the player as ai", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex, ex2]), now);
  assert.deepEqual(new Set(repo.peekOwners().map((o) => [o.userId, o.source, o.enabledForReuse].join())), new Set(["u1,ai,false"]));
  assert.equal(repo.peekOwners().length, 2);
  assert.equal(repo.peekBlocks().size, 2);
  assert.deepEqual(repo.peekBlocks().get(idOf(ex)), { key: blockKeyOf(ex), parentId: null, provenance: { model: null, promptVersion: null, docsAgents: null, docsTeaching: null } });
});

test("the server works out block ids itself: a sent blockId is not used", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([{ ...ex, blockId: "0".repeat(32) }]), now);
  assert.deepEqual([...repo.peekBlocks().keys()], [idOf(ex)]);
});

test("an edited block is owned as edit with its parent, only when the player owns the parent", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex]), now);
  const edited = { ...ex, id: "s9", title: "Spider walk, slower", parentBlockId: idOf(ex) };
  // u1 owns the parent (it is also still in the document's history)
  await writeDoc(repo, "u1", "plan", planDoc([edited]), now);
  const mine = repo.peekOwners().find((o) => o.blockId === idOf(edited));
  assert.deepEqual(mine && [mine.userId, mine.source], ["u1", "edit"]);
  assert.equal(repo.peekBlocks().get(idOf(edited))?.parentId, idOf(ex));
  // u2 names u1's private block as the parent of their own edit: the row is theirs, the parent is not written
  const other = { ...ex, id: "s7", title: "Spider walk, other", parentBlockId: idOf(ex) };
  await writeDoc(repo, "u2", "plan", planDoc([other]), now);
  assert.equal(repo.peekBlocks().get(idOf(other))?.parentId, null);
  assert.equal(repo.peekOwners().find((o) => o.blockId === idOf(other))?.source, "edit");
  assert.equal(repo.peekOwners().some((o) => o.userId === "u2" && o.blockId === idOf(ex)), false);
});

test("an edited block keeps its parent when the parent is in the same document", async () => {
  const repo = memoryUserDataRepo();
  const edited = { ...ex, id: "s9", title: "Spider walk, slower", parentBlockId: idOf(ex) };
  await writeDoc(repo, "u1", "plan", planDoc([edited, ex]), now);
  assert.equal(repo.peekBlocks().get(idOf(edited))?.parentId, idOf(ex));
});

test("two players with the same block share one row and own it each", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex]), now);
  await writeDoc(repo, "u2", "plan", planDoc([ex]), now);
  assert.equal(repo.peekBlocks().size, 1);
  assert.deepEqual(repo.peekOwners().map((o) => o.userId).sort(), ["u1", "u2"]);
});

test("a stored block never changes: a later save naming another parent leaves it as it was", async () => {
  const repo = memoryUserDataRepo();
  const edited = { ...ex, id: "s9", title: "Spider walk, slower", parentBlockId: idOf(ex) };
  await writeDoc(repo, "u1", "plan", planDoc([edited, ex]), now);
  await writeDoc(repo, "u2", "plan", planDoc([{ ...edited, parentBlockId: idOf(ex2) }, ex2]), now);
  assert.equal(repo.peekBlocks().get(idOf(edited))?.parentId, idOf(ex));
});

test("a second save of the same plan adds no rows", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex, ex2]), now);
  const state = (await readDoc(repo, "u1", "plan")) as PlanState;
  assert.equal(await storePlanBlocks(repo, "u1", state, now), 0);
  assert.equal(repo.peekOwners().length, 2);
  assert.equal(await storePlanBlocks(repo, "u1", EMPTY_STATE, now), 0);
});

test("deleting an account drops its owner rows, not the blocks", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex]), now);
  await writeDoc(repo, "u2", "plan", planDoc([ex, ex2]), now);
  repo.cascadeUser("u1");
  assert.equal(repo.peekBlocks().size, 2);
  assert.deepEqual(repo.peekOwners().map((o) => o.userId), ["u2", "u2"]);
});

test("the app owns a block once: null-user owner rows are one", async () => {
  const repo = memoryUserDataRepo();
  const block = { id: idOf(ex), key: blockKeyOf(ex), parentId: null, source: "seed" as const, enabledForReuse: true };
  await repo.addBlocks(null, [block], now);
  await repo.addBlocks(null, [block], now);
  assert.equal(repo.peekOwners().length, 1);
});

test("a progress entry and a day time keep their block ids and dates through the repo", async () => {
  const repo = memoryUserDataRepo();
  const b = idOf(ex);
  await putEntry(repo, "u1", entry({ blockId: b }), now);
  assert.equal((await readEntries(repo, "u1"))[0].blockId, b);
  const t = { planId: "p", day: 1, elapsed: 60, spent: { s1: 60 }, blocks: { s1: b }, on: { "2026-11-14": 60 } };
  assert.equal(await writePlanTime(repo, "u1", t, now), true);
  assert.deepEqual(await readPlanTimes(repo, "u1", "p"), [t]);
});

test("the plan document is saved even when the library insert throws", async () => {
  const repo = memoryUserDataRepo();
  const failing = { ...repo, addBlocks: async () => { throw new Error("db down"); } };
  const logged: unknown[] = [];
  const error = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    assert.deepEqual(await writeDoc(failing, "u1", "plan", planDoc([ex]), now), { ok: true, version: 1 });
  } finally {
    console.error = error;
  }
  assert.equal(logged.length, 1);
  assert.ok(((await readDoc(repo, "u1", "plan")) as PlanState).current, "the document is stored");
  assert.equal(repo.peekBlocks().size, 0);
  await writeDoc(repo, "u1", "plan", planDoc([ex]), now); // the next save repairs it
  assert.equal(repo.peekBlocks().size, 1);
});

// --- block ids kept when a tab still running the old code saves

const B1 = "1".repeat(32);
const B2 = "2".repeat(32);

test("a day time written without blocks or dates keeps the stored ones (a tab still running the old code)", async () => {
  const repo = memoryUserDataRepo();
  await writePlanTime(repo, "u1", { planId: "p", day: 0, elapsed: 60, spent: { s1: 60 }, blocks: { s1: B1 }, on: { "2026-11-14": 60 } }, now);
  await writePlanTime(repo, "u1", { planId: "p", day: 0, elapsed: 90, spent: { s1: 90 } }, now);
  assert.deepEqual(await readPlanTimes(repo, "u1", "p"), [{ planId: "p", day: 0, elapsed: 90, spent: { s1: 90 }, blocks: { s1: B1 }, on: { "2026-11-14": 60 } }]);
  // sent ones still replace them
  await writePlanTime(repo, "u1", { planId: "p", day: 0, elapsed: 95, spent: { s1: 95 }, blocks: { s1: B2 }, on: { "2026-11-15": 35 } }, now);
  const [t] = await readPlanTimes(repo, "u1", "p");
  assert.deepEqual([t.blocks, t.on], [{ s1: B2 }, { "2026-11-15": 35 }]);
});

test("a progress entry written without a block id keeps the stored one (a slot's block never changes)", async () => {
  const repo = memoryUserDataRepo();
  await putEntry(repo, "u1", entry({ exerciseId: "s1", stars: 2, blockId: B1 }), now);
  await putEntry(repo, "u1", entry({ exerciseId: "s1", stars: 4 }), now); // a tab still running the old code
  const [e] = await readEntries(repo, "u1");
  assert.deepEqual([e.stars, e.blockId], [4, B1]);
  // a sent one still replaces it
  await putEntry(repo, "u1", entry({ exerciseId: "s1", stars: 5, blockId: B2 }), now);
  assert.equal((await readEntries(repo, "u1"))[0].blockId, B2);
});

test("readAllPlanTimes lists every plan's days for this player only", async () => {
  const repo = memoryUserDataRepo();
  const t = { planId: "p", day: 0, elapsed: 120, spent: { e1: 120 } };
  await writePlanTime(repo, "u1", t, now);
  await writePlanTime(repo, "u1", { ...t, planId: "q", day: 3, on: { "2026-11-14": 120 } }, now);
  await writePlanTime(repo, "u2", { ...t, planId: "r" }, now);
  const all = await readAllPlanTimes(repo, "u1");
  assert.deepEqual(all.map((d) => `${d.planId}:${d.day}`).sort(), ["p:0", "q:3"]);
  assert.deepEqual(all.find((d) => d.planId === "q")!.on, { "2026-11-14": 120 }); // on_dates comes back as on
});

// --- given plans (claimed from an invite) count like the player's own

test("storePlanBlocks puts the blocks of the given plans in the library too", async () => {
  const repo = memoryUserDataRepo();
  const given = { id: "g1", from: "share-1", startedOn: "2026-11-01", done: {}, config: { title: "Given", days: [{ theme: "d", exercises: [ex2] }] } };
  await writeDoc(repo, "u1", "plan", { ...planDoc([ex]), given: [given] }, now);
  assert.deepEqual([...repo.peekBlocks().keys()].sort(), [idOf(ex), idOf(ex2)].sort());
});

test("each write adds 1 to the version; reading answers it, 0 when nothing is stored", async () => {
  const repo = memoryUserDataRepo();
  assert.equal((await readDocVersioned(repo, "u1", "note")).version, 0);
  assert.deepEqual(await writeDoc(repo, "u1", "note", { block: null }, now), { ok: true, version: 1 });
  assert.deepEqual(await writeDoc(repo, "u1", "note", { block: null }, now), { ok: true, version: 2 });
  assert.equal((await readDocVersioned(repo, "u1", "note")).version, 2);
  assert.equal((await readDocVersioned(repo, "u2", "note")).version, 0);
});

test("a write that names an old version is stale: nothing changes, and the stored version is answered", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "creator", { family: 0, mode: 1, tonicPc: 5 }, now);
  const before = await readDocVersioned(repo, "u1", "creator");
  assert.deepEqual(await writeDoc(repo, "u1", "creator", { family: 0, mode: 2, tonicPc: 7 }, now, 0), { ok: false, error: "stale", version: 1 });
  assert.deepEqual(await readDocVersioned(repo, "u1", "creator"), before);
  assert.deepEqual(await writeDoc(repo, "u1", "creator", { family: 0, mode: 2, tonicPc: 7 }, now, 1), { ok: true, version: 2 });
});

test("expecting 0 writes a document that is not stored yet, once; expecting more than 0 does not create one", async () => {
  const repo = memoryUserDataRepo();
  assert.deepEqual(await writeDoc(repo, "u1", "creator", { family: 0, mode: 1, tonicPc: 5 }, now, 3), { ok: false, error: "stale", version: 0 });
  assert.equal(await repo.getDocVersioned("u1", "creator"), null);
  assert.deepEqual(await writeDoc(repo, "u1", "creator", { family: 0, mode: 1, tonicPc: 5 }, now, 0), { ok: true, version: 1 });
});

test("a stale plan write does not touch the library", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", planDoc([ex]), now);
  assert.equal(repo.peekOwners().length, 1);
  const done = await writeDoc(repo, "u1", "plan", planDoc([ex, ex2]), now, 0);
  assert.deepEqual(done, { ok: false, error: "stale", version: 1 });
  assert.equal(repo.peekOwners().length, 1);
  assert.equal(repo.peekBlocks().size, 1);
});

/** A student's plan document: a week their teacher made, with the teacher's comment, in `given`, and an older one in the history. */
const taughtDoc = (comment: string | null, done: Record<string, true> = {}) => ({
  current: null,
  history: [{ id: "old", startedOn: "2026-11-02", done: {}, teacher: { madeAt: "2026-11-02T09:00:00.000Z", comment: "old words" }, config: { title: "", days: [{ theme: "", exercises: [ex] }] } }],
  given: [{ id: "wk", startedOn: "2026-11-16", done, teacher: { madeAt: "2026-11-16T09:00:00.000Z", ...(comment === null ? {} : { comment }) }, config: { title: "", days: [{ theme: "", exercises: [ex] }] } }],
});

test("the owner's read of a plan has no teacher comment anywhere; the stored document keeps it", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  const read = await readOwnDocVersioned(repo, "u1", "plan");
  assert.equal(read.version, 1);
  assert.doesNotMatch(JSON.stringify(read.data), /comment|rushes|old words/);
  const s = read.data as PlanState;
  assert.deepEqual(s.given[0].teacher, { madeAt: "2026-11-16T09:00:00.000Z" });
  assert.deepEqual(s.history[0].teacher, { madeAt: "2026-11-02T09:00:00.000Z" });
  const stored = (await readDoc(repo, "u1", "plan")) as PlanState;
  assert.equal(stored.given[0].teacher?.comment, "Ben rushes the changes");
  assert.equal(stored.history[0].teacher?.comment, "old words");
});

test("the owner's read of another kind is the document as stored", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "creator", { family: 0, mode: 1, tonicPc: 5 }, now);
  assert.deepEqual(await readOwnDocVersioned(repo, "u1", "creator"), await readDocVersioned(repo, "u1", "creator"));
});

test("a student's save, sent without the comments, keeps the stored ones on the same plan ids", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  const seen = (await readOwnDocVersioned(repo, "u1", "plan")).data as PlanState;
  const ticked = { ...seen, given: [{ ...seen.given[0], done: { "0:0": true as const } }] };
  assert.deepEqual(await writeDoc(repo, "u1", "plan", ticked, now, 1), { ok: true, version: 2 });
  const stored = (await readDoc(repo, "u1", "plan")) as PlanState;
  assert.deepEqual(stored.given[0].done, { "0:0": true });
  assert.equal(stored.given[0].teacher?.comment, "Ben rushes the changes");
  assert.equal(stored.history[0].teacher?.comment, "old words");
});

test("a save without a version keeps the stored comments too", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  await writeDoc(repo, "u1", "plan", taughtDoc(null), now);
  assert.equal(((await readDoc(repo, "u1", "plan")) as PlanState).given[0].teacher?.comment, "Ben rushes the changes");
});

test("a write carrying a new comment keeps the new one (the teacher's write)", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  assert.deepEqual(await writeDoc(repo, "u1", "plan", taughtDoc("Slower this week"), now, 1), { ok: true, version: 2 });
  assert.equal(((await readDoc(repo, "u1", "plan")) as PlanState).given[0].teacher?.comment, "Slower this week");
});

test("a stale plan save still writes nothing, comments or not", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  await writeDoc(repo, "u1", "plan", taughtDoc("Slower this week"), now, 1);
  assert.deepEqual(await writeDoc(repo, "u1", "plan", taughtDoc(null, { "0:0": true }), now, 1), { ok: false, error: "stale", version: 2 });
  const stored = (await readDoc(repo, "u1", "plan")) as PlanState;
  assert.deepEqual(stored.given[0].done, {});
  assert.equal(stored.given[0].teacher?.comment, "Slower this week");
});

test("a comment is put back only on a plan that still has a teacher record and the same id", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  const other = taughtDoc(null);
  other.given[0].id = "new-wk";
  await writeDoc(repo, "u1", "plan", other, now);
  const stored = (await readDoc(repo, "u1", "plan")) as PlanState;
  assert.equal(stored.given[0].teacher?.comment, undefined);
});

test("an owner's save can't change the teacher's comment: the stored one stays", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  assert.deepEqual(await writeDoc(repo, "u1", "plan", taughtDoc("I practised a lot"), now, 1, { owner: true }), { ok: true, version: 2 });
  assert.equal(((await readDoc(repo, "u1", "plan")) as PlanState).given[0].teacher?.comment, "Ben rushes the changes");
});

test("an owner's save that drops a week's teacher record gets the record and its comment back, by plan id", async () => {
  const repo = memoryUserDataRepo();
  await writeDoc(repo, "u1", "plan", taughtDoc("Ben rushes the changes"), now);
  const sent = taughtDoc(null);
  const { teacher: _gone, ...bare } = sent.history[0];
  void _gone;
  await writeDoc(repo, "u1", "plan", { ...sent, history: [bare] }, now, 1, { owner: true });
  assert.deepEqual(((await readDoc(repo, "u1", "plan")) as PlanState).history[0].teacher, { madeAt: "2026-11-02T09:00:00.000Z", comment: "old words" });
});

test("an owner's save can't make a teacher record or a comment of its own", async () => {
  const repo = memoryUserDataRepo();
  const own = { current: { id: "mine", startedOn: "2026-11-18", done: {}, teacher: { madeAt: "2026-11-18T09:00:00.000Z", comment: "made up" }, config: { title: "", days: [{ theme: "", exercises: [ex] }] } }, history: [], given: [] };
  await writeDoc(repo, "u1", "plan", own, now, undefined, { owner: true });
  assert.equal(((await readDoc(repo, "u1", "plan")) as PlanState).current?.teacher, undefined);
});

test("a save without a version reads again when another write lands between its read and its write, and keeps that write's comment", async () => {
  const base = memoryUserDataRepo();
  await writeDoc(base, "u1", "plan", taughtDoc("first words"), now);
  let raced = false;
  const repo = {
    ...base,
    async putDoc(...args: Parameters<typeof base.putDoc>) {
      if (!raced) {
        raced = true;
        // the teacher's write lands after this save read version 1
        await base.putDoc("u1", "plan", taughtDoc("newer words"), now);
      }
      return base.putDoc(...args);
    },
  };
  assert.deepEqual(await writeDoc(repo, "u1", "plan", taughtDoc(null, { "0:0": true }), now), { ok: true, version: 3 });
  const stored = (await readDoc(base, "u1", "plan")) as PlanState;
  assert.equal(stored.given[0].teacher?.comment, "newer words");
  assert.deepEqual(stored.given[0].done, { "0:0": true });
});
