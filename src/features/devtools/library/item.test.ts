import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BLOCKS, SEED_PLANS } from "@/features/library/seed";
import { seedBlocksById, seedItem } from "./item";

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
