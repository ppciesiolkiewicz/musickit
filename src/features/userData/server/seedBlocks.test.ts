import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "@/features/plan/model/catalogue";
import { parseExercise } from "@/features/plan/model/config";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { startPlan } from "@/features/plan/model/schedule";
import { EMPTY_STATE, type PlanConfig } from "@/features/plan/model/types";
import { exampleBlocks, libraryPlanBlocks, seedBlocks } from "./seedBlocks";
import { memoryUserDataRepo } from "./repo.memory";

const NOW = new Date(2026, 10, 15, 12);
const reply = JSON.stringify(PLAN_EXAMPLES[0].plan);

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
  const list = libraryPlanBlocks([reply, "not json"]);
  assert.ok(list.length > 0);
  for (const b of list) assert.deepEqual([b.source, b.enabledForReuse, b.parentId], ["seed", true, null]);
  assert.deepEqual(libraryPlanBlocks(["not json"]), []);
});

test("seedBlocks: library blocks are owned by the app as seed, enabled; examples as example, not enabled", async () => {
  const repo = memoryUserDataRepo();
  const r = await seedBlocks(repo, [reply], NOW);
  const owners = repo.peekOwners();
  assert.ok(owners.every((o) => o.userId === null));
  for (const b of libraryPlanBlocks([reply])) assert.deepEqual(owners.find((o) => o.blockId === b.id), { userId: null, blockId: b.id, source: "seed", enabledForReuse: true });
  const onlyEx = exampleBlocks().find((b) => !libraryPlanBlocks([reply]).some((l) => l.id === b.id))!;
  assert.deepEqual(owners.find((o) => o.blockId === onlyEx.id), { userId: null, blockId: onlyEx.id, source: "example", enabledForReuse: false });
  assert.equal(r.library, libraryPlanBlocks([reply]).length);
  assert.equal(r.examples, exampleBlocks().length);
  assert.equal(repo.peekBlocks().size, owners.length);
});

test("seedBlocks run twice adds nothing", async () => {
  const repo = memoryUserDataRepo();
  await seedBlocks(repo, [reply], NOW);
  const n = repo.peekOwners().length;
  await seedBlocks(repo, [reply], NOW);
  assert.equal(repo.peekOwners().length, n);
});
