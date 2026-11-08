import { test } from "node:test";
import assert from "node:assert/strict";
import { firstOf } from "./attention";

test("firstOf picks the earliest by the order given", () => {
  assert.equal(firstOf([3, 1, 2], (a, b) => a < b), 1);
  assert.equal(firstOf([], (a: number, b: number) => a < b), null);
  // ties keep the first one met
  assert.deepEqual(firstOf([{ k: 1, n: "a" }, { k: 1, n: "b" }], (a, b) => a.k < b.k), { k: 1, n: "a" });
});
