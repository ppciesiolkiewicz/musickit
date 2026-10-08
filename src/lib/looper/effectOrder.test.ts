import { test } from "node:test";
import assert from "node:assert/strict";
import { moveEffect, type EffectSpec } from "./effects";

const fx = (id: string, post: boolean): EffectSpec => ({ id, kind: "reverb", bypass: false, post, params: {} });

test("moving swaps with the neighbour in the same section", () => {
  const list = [fx("a", false), fx("b", true), fx("c", false), fx("d", true)];
  assert.deepEqual(moveEffect(list, "c", -1).map((e) => e.id), ["c", "b", "a", "d"]);
  assert.deepEqual(moveEffect(list, "b", 1).map((e) => e.id), ["a", "d", "c", "b"]);
});

test("the ends of a section stay put", () => {
  const list = [fx("a", false), fx("b", false)];
  assert.equal(moveEffect(list, "a", -1), list);
  assert.equal(moveEffect(list, "b", 1), list);
  assert.equal(moveEffect(list, "zzz", 1), list);
});
