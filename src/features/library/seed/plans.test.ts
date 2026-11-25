import { test } from "node:test";
import assert from "node:assert/strict";
import { blockOfChoice, isCuratedId } from "@/features/plan/model/blockId";
import { expandPlan } from "./choices";
import { SEED_BLOCKS, SEED_PLANS } from ".";

test("no seed plan id is used twice", () => {
  const ids = SEED_PLANS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every seed plan's refs name a seed block and choice, and each exercise carries its block and choice ids", () => {
  for (const f of SEED_PLANS) {
    const { plan, errors } = expandPlan(f, SEED_BLOCKS);
    assert.deepEqual(errors, [], f.id);
    for (const e of (plan.days as { exercises: { blockId?: string; choiceId?: string }[] }[]).flatMap((d) => d.exercises)) {
      assert.ok(e.blockId && isCuratedId(e.blockId), f.id);
      assert.equal(e.choiceId && blockOfChoice(e.choiceId), e.blockId, f.id);
    }
  }
});
