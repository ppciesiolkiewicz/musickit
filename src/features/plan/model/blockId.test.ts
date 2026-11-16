import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { blockIdOf, blockKeyOf, canonicalJson, isBlockId, withoutCellIds } from "./blockId";
import type { PlanExercise } from "./types";

const ex = {
  id: "s1",
  title: "Barre drill",
  minutes: 5,
  area: "guitar",
  topic: "t1",
  level: "beginner",
  concepts: ["b", "a"],
  tags: ["ear", "technique"],
  choice: { open: { key: 0, scale: "major", bpm: 80 } },
  cells: [
    { type: "text", text: "Play it" },
    { type: "section", title: "Step", cells: [{ type: "text", text: "inside" }] },
  ],
} as unknown as PlanExercise;

const reverseKeys = (o: unknown): unknown => {
  if (Array.isArray(o)) return o.map(reverseKeys);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).reverse().map(([k, v]) => [k, reverseKeys(v)]));
  return o;
};

test("blockIdOf is 32 hex chars and is node:crypto's sha256 of the canonical key", () => {
  const k = blockKeyOf(ex);
  assert.match(blockIdOf(k), /^[0-9a-f]{32}$/);
  assert.equal(blockIdOf(k), createHash("sha256").update(canonicalJson(k)).digest("hex").slice(0, 32));
});
test("isBlockId", () => {
  assert.equal(isBlockId("a".repeat(32)), true);
  assert.equal(isBlockId("A".repeat(32)), false);
  assert.equal(isBlockId("a".repeat(31)), false);
  assert.equal(isBlockId(5), false);
});
test("canonicalJson sorts keys at every depth and drops undefined", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: undefined, c: [2, { z: 1, y: 0 }] } }), '{"a":{"c":[2,{"y":0,"z":1}]},"b":1}');
});
test("withoutCellIds removes ids at every depth", () => {
  const cells = [{ type: "section", title: "S", id: "x", cells: [{ type: "text", text: "t", id: "y" }] }] as never;
  assert.deepEqual(withoutCellIds(cells), [{ type: "section", title: "S", cells: [{ type: "text", text: "t" }] }]);
});
test("cell ids, key order and concept order do not change the id", () => {
  const withIds = {
    ...ex,
    cells: ex.cells.map((c, i) => ({
      ...c,
      id: `c${i}`,
      ...(c.type === "section" ? { cells: c.cells.map((d, j) => ({ ...d, id: `d${j}` })) } : {}),
    })),
  } as PlanExercise;
  const reordered = { ...ex, concepts: ["a", "b"], choice: reverseKeys(ex.choice) } as PlanExercise;
  assert.equal(blockIdOf(blockKeyOf(withIds)), blockIdOf(blockKeyOf(ex)));
  assert.equal(blockIdOf(blockKeyOf(reordered)), blockIdOf(blockKeyOf(ex)));
});
test("minutes, why, links and slot ids do not change the id; title, a cell, level and topic do", () => {
  const id = blockIdOf(blockKeyOf(ex));
  assert.equal(
    blockIdOf(blockKeyOf({ ...ex, minutes: 99, why: "x", learnBefore: ["/a"], exploreMore: ["/b"], id: "s2", blockId: "f".repeat(32), parentBlockId: "e".repeat(32) } as PlanExercise)),
    id,
  );
  for (const other of [
    { ...ex, title: "Other" },
    { ...ex, level: "advanced" },
    { ...ex, topic: "t2" },
    { ...ex, cells: [...ex.cells, { type: "text", text: "more" }] },
  ])
    assert.notEqual(blockIdOf(blockKeyOf(other as PlanExercise)), id);
});
test("steps take the place of level in the key, in any order", () => {
  const a = blockKeyOf({ ...ex, steps: ["barre:2", "barre:1"] });
  assert.deepEqual(a.steps, ["barre:1", "barre:2"]);
  assert.equal(a.level, undefined);
  assert.equal(blockIdOf(a), blockIdOf(blockKeyOf({ ...ex, level: "advanced", steps: ["barre:1", "barre:2"] })));
  assert.notEqual(blockIdOf(a), blockIdOf(blockKeyOf(ex)));
});

test("empty concepts and tags are the same as none", () => {
  assert.equal(
    blockIdOf(blockKeyOf({ ...ex, concepts: [], tags: [] })),
    blockIdOf(blockKeyOf({ ...ex, concepts: undefined, tags: undefined })),
  );
});
test("duplicate tags count once", () => {
  assert.deepEqual(blockKeyOf({ ...ex, tags: ["b", "a", "b"] }).tags, ["a", "b"]);
});
test("damaged meta never throws: only strings are kept", () => {
  const bad = { ...ex, concepts: "x", tags: [1, "a"], topic: 7, level: null, area: {} } as unknown as PlanExercise;
  const k = blockKeyOf(bad);
  assert.equal("concepts" in k, false);
  assert.deepEqual(k.tags, ["a"]);
  assert.equal("topic" in k, false);
  assert.equal("level" in k, false);
  assert.equal("area" in k, false);
  assert.match(blockIdOf(k), /^[0-9a-f]{32}$/);
});
