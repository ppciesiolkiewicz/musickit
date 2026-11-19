import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BLOCKS, SEED_PLANS } from "@/features/library/seed";
import type { BlockDetail } from "@/features/library/server/types";
import { blockFileItem, databaseItem, seedBlocksById, seedItem } from "./item";

test("a plan row draws from the seed plan with its id", () => {
  const plan = SEED_PLANS[0];
  const item = seedItem(plan.id);
  assert.equal(item?.kind, "plan");
  assert.equal(item?.seedId, plan.id);
  assert.deepEqual(item?.versions, plan.versions);
});

test("a block row draws from the seed block whose computed id matches, keyed by the file id", () => {
  const ids = seedBlocksById();
  assert.equal(ids.size, SEED_BLOCKS.length);
  const [blockId, file] = [...ids].find(([, f]) => f.showcase)!;
  const item = seedItem(blockId);
  assert.equal(item?.kind, "block");
  assert.equal(item?.seedId, file.id);
  assert.ok(item?.feature);
  assert.equal(seedItem(file.id)?.seedId, file.id);
});

test("an id no seed file has is not a seed item", () => {
  assert.equal(seedItem("0".repeat(32)), null);
});

test("a curated block id draws its first choice and lists every choice, active or not", () => {
  const item = seedItem("guitar-beginner-down-up-picking");
  assert.equal(item?.kind, "block");
  assert.equal(item?.choiceId, "guitar-beginner-down-up-picking/beginner");
  assert.deepEqual(item?.choices, [{ id: "guitar-beginner-down-up-picking/beginner", name: "beginner", level: "beginner", steps: ["picking:2"], minutes: 6, active: true }]);
  assert.equal(JSON.parse(item!.json).choiceId, "guitar-beginner-down-up-picking/beginner");
});

test("a choice id draws that choice of its block; a draft choice is listed inactive", () => {
  const base = SEED_BLOCKS.find((f) => f.id === "guitar-beginner-down-up-picking")!;
  const file = { ...base, id: "test-two-choices", choices: [base.choices[0], { ...base.choices[0], name: "faster", minutes: 9, draft: true }] };
  const item = blockFileItem(file, "test-two-choices/faster");
  assert.equal(item?.seedId, "test-two-choices");
  assert.equal(item?.choiceId, "test-two-choices/faster");
  assert.equal(JSON.parse(item!.json).minutes, 9);
  assert.deepEqual(item?.choices?.map((c) => [c.name, c.active]), [["beginner", true], ["faster", false]]);
  assert.equal(blockFileItem(file, "test-two-choices")?.choiceId, "test-two-choices/beginner");
  assert.equal(blockFileItem(file, "test-two-choices/no-such-choice"), null);
  assert.equal(seedItem("guitar-beginner-down-up-picking/beginner")?.choiceId, "guitar-beginner-down-up-picking/beginner");
  assert.equal(seedItem("guitar-beginner-down-up-picking/no-such-choice"), null);
});

test("a database block lists its choices and draws the one named, else the first", () => {
  const choices = [
    { id: "a-block/easy", name: "easy", level: "beginner", steps: ["picking:1"], minutes: 5, active: true },
    { id: "a-block/hard", name: "hard", level: "advanced", steps: ["picking:4"], minutes: 8, active: false },
  ];
  const b = { id: "a-block", title: "T", area: "guitar", topic: null, concepts: [], level: "beginner", steps: ["picking:1", "picking:4"], choices, tags: [], provenance: { model: null, promptVersion: null, docsAgents: null, docsTeaching: null }, use: { times: 0, seconds: 0, stars: [0, 0, 0, 0, 0] }, content: { title: "T", cells: [] }, parentId: null, slot: null } as unknown as BlockDetail;
  const first = databaseItem(b);
  assert.deepEqual([first.choiceId, first.choices], ["a-block/easy", choices]);
  const hard = databaseItem(b, "a-block/hard");
  assert.equal(hard.choiceId, "a-block/hard");
  assert.deepEqual([JSON.parse(hard.json).level, JSON.parse(hard.json).steps, JSON.parse(hard.json).minutes], ["advanced", ["picking:4"], 8]);
});
