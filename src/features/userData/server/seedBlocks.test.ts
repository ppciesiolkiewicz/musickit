import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { startPlan } from "@/features/plan/model/schedule";
import { EMPTY_STATE, type PlanConfig } from "@/features/plan/model/types";
import { libraryBlocksOf } from "@/features/plan/model/libraryBlocks";
import { parsePlanConfig } from "@/features/plan/model/config";
import { exampleBlocks, libraryPlanBlocks, planBlockRows, seedBlocks, type SeedPlan } from "./seedBlocks";
import { memoryUserDataRepo } from "./repo.memory";

const NOW = new Date(2026, 10, 15, 12);
const reply = JSON.stringify(PLAN_EXAMPLES[0].plan);
const prov = { model: "claude-fable-5-2", promptVersion: 7, docsAgents: 2, docsTeaching: 5 };
const plan: SeedPlan = { id: "p1", reply, provenance: prov };

test("an example's block id is the id a started plan of the same exercise gets", () => {
  const ex = EXERCISE_EXAMPLES[0];
  const block = parseExercise(ex.exercise, "x", catalogue()).block!;
  const config = { title: "t", days: [{ theme: "d", exercises: [block] }] } as unknown as PlanConfig;
  let n = 0;
  const s = startPlan(EMPTY_STATE, config, () => `n${++n}`, "2026-11-15");
  const id = s.current!.config.days[0].exercises[0].blockId;
  assert.ok(id);
  assert.ok(exampleBlocks().some((b) => b.id === id));
});

test("exampleBlocks: every one is an example, not enabled, with no parent", () => {
  const list = exampleBlocks();
  assert.ok(list.length >= EXERCISE_EXAMPLES.length);
  for (const b of list) assert.deepEqual([b.source, b.enabledForReuse, b.parentId], ["example", false, null]);
  assert.equal(new Set(list.map((b) => b.id)).size, list.length);
});

test("libraryPlanBlocks: a reply gives seed blocks, enabled; a broken one is skipped", () => {
  const list = libraryPlanBlocks([plan, { ...plan, id: "p2", reply: "not json" }]);
  assert.ok(list.length > 0);
  for (const b of list) assert.deepEqual([b.source, b.enabledForReuse, b.parentId], ["seed", true, null]);
  assert.deepEqual(libraryPlanBlocks([{ ...plan, reply: "not json" }]), []);
});

test("seedBlocks: library blocks are owned by the app as seed, enabled; examples as example, not enabled", async () => {
  const repo = memoryUserDataRepo();
  const r = await seedBlocks(repo, [plan], NOW);
  const owners = repo.peekOwners();
  assert.ok(owners.every((o) => o.userId === null));
  for (const b of libraryPlanBlocks([plan])) assert.deepEqual(owners.find((o) => o.blockId === b.id), { userId: null, blockId: b.id, source: "seed", enabledForReuse: true });
  const onlyEx = exampleBlocks().find((b) => !libraryPlanBlocks([plan]).some((l) => l.id === b.id))!;
  assert.deepEqual(owners.find((o) => o.blockId === onlyEx.id), { userId: null, blockId: onlyEx.id, source: "example", enabledForReuse: false });
  assert.equal(r.library, libraryPlanBlocks([plan]).length);
  assert.equal(r.examples, exampleBlocks().length);
  assert.equal(repo.peekBlocks().size, owners.length);
});

test("seedBlocks run twice adds nothing", async () => {
  const repo = memoryUserDataRepo();
  await seedBlocks(repo, [plan], NOW);
  const n = repo.peekOwners().length;
  await seedBlocks(repo, [plan], NOW);
  assert.equal(repo.peekOwners().length, n);
});

test("a seeded plan's blocks carry the plan's provenance", () => {
  for (const b of libraryPlanBlocks([plan])) assert.deepEqual(b.provenance, prov);
});

test("an example's block carries its model and the versions it was written to, no prompt version", () => {
  // the first exercise example is the first block seen, so no earlier example's provenance wins
  const ex = EXERCISE_EXAMPLES[0];
  const block = parseExercise(ex.exercise, ex.id, catalogue()).block!;
  const config = { title: ex.id, days: [{ theme: ex.id, exercises: [block] }] } as unknown as PlanConfig;
  const id = libraryBlocksOf([{ id: "s", startedOn: "2026-01-01", done: {}, config } as never])[0].id;
  assert.deepEqual(exampleBlocks().find((b) => b.id === id)!.provenance, { model: ex.model ?? null, promptVersion: null, docsAgents: ex.docs.agents, docsTeaching: ex.docs.teaching });
});

test("a block in two plans keeps the first plan's provenance", () => {
  const other = { model: "other", promptVersion: 1, docsAgents: 1, docsTeaching: 1 };
  const list = libraryPlanBlocks([plan, { id: "p2", reply, provenance: other }]);
  for (const b of list) assert.deepEqual(b.provenance, prov);
});

test("planBlockRows: one row per exercise slot from 0, with minutes and the block id; [] when the reply doesn't parse", () => {
  const rows = planBlockRows(reply);
  const r = parsePlanConfig(reply, catalogue());
  assert.ok(r.ok);
  const total = r.config.days.reduce((n, d) => n + d.exercises.length, 0);
  assert.equal(rows.length, total);
  assert.deepEqual(rows[0], { day: 0, place: 0, blockId: rows[0].blockId, minutes: r.config.days[0].exercises[0].minutes });
  const ids = new Set(libraryPlanBlocks([plan]).map((b) => b.id));
  assert.ok(rows.every((x) => ids.has(x.blockId)));
  assert.deepEqual(planBlockRows("not json"), []);
});

test("seedBlocks: sets each plan's blocks, counted, and a second run leaves them the same", async () => {
  const repo = memoryUserDataRepo();
  const r = await seedBlocks(repo, [plan], NOW);
  assert.equal(r.planBlocks, planBlockRows(reply).length);
  assert.deepEqual(repo.peekPlanBlocks("p1"), planBlockRows(reply));
  await seedBlocks(repo, [plan], NOW);
  assert.deepEqual(repo.peekPlanBlocks("p1"), planBlockRows(reply));
  for (const b of libraryPlanBlocks([plan])) assert.deepEqual(repo.peekBlocks().get(b.id)!.provenance, prov);
});

test("seedBlocks: a plan whose reply no longer parses ends with no block rows", async () => {
  const repo = memoryUserDataRepo();
  await seedBlocks(repo, [plan], NOW);
  assert.ok(repo.peekPlanBlocks("p1").length > 0);
  const r = await seedBlocks(repo, [{ ...plan, reply: "not json" }], NOW);
  assert.deepEqual(repo.peekPlanBlocks("p1"), []);
  assert.equal(r.planBlocks, 0);
});
