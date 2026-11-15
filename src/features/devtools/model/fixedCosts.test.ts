import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXED_COSTS, fixedTotal } from "./fixedCosts";

test("the fixed total adds only the costs switched on", () => {
  const costs = [
    { id: "a", label: "A", monthly: 20, note: "", on: true },
    { id: "b", label: "B", monthly: 7, note: "", on: true },
  ];
  assert.equal(fixedTotal(new Set(["a", "b"]), costs), 27);
  assert.equal(fixedTotal(new Set(["b"]), costs), 7);
  assert.equal(fixedTotal(new Set(), costs), 0);
});

test("every fixed cost has its own id and a price of zero or more", () => {
  assert.equal(new Set(FIXED_COSTS.map((c) => c.id)).size, FIXED_COSTS.length);
  for (const c of FIXED_COSTS) assert.ok(c.monthly >= 0, c.id);
});
