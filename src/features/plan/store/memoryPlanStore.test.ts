import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryPlanStore } from "./memoryPlanStore";

test("memory loadAllTimes returns every plan's saved records", async () => {
  const s = memoryPlanStore();
  await s.saveTime({ planId: "a", day: 0, elapsed: 1, spent: {} });
  await s.saveTime({ planId: "b", day: 2, elapsed: 2, spent: {} });
  assert.deepEqual((await s.loadAllTimes()).map((d) => d.planId).sort(), ["a", "b"]);
});
