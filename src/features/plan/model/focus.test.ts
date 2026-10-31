import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONCEPTS } from "./concepts";
import { focusOptions, focusWithout, toggleFocus } from "./focus";

const first = (area: string, level: string) => CONCEPTS.filter((c) => c.area === area && c.level === level);

describe("focusOptions", () => {
  it("never offers unrated concepts as weak", () => {
    const ids = focusOptions({ levels: { guitar: "advanced" }, ratings: {} }).map((c) => c.id);
    assert.deepEqual(ids, []);
  });
  it("offers 1-2 star concepts only", () => {
    const [a, b, c] = first("guitar", "beginner");
    const ids = focusOptions({ levels: { guitar: "beginner" }, ratings: { [a.id]: 1, [b.id]: 2, [c.id]: 3 } }).map((x) => x.id);
    assert.ok(ids.includes(a.id) && ids.includes(b.id) && !ids.includes(c.id));
  });
  it("offers the next level's first two concepts", () => {
    const ids = focusOptions({ levels: { guitar: "beginner" }, ratings: {} }).map((c) => c.id);
    assert.deepEqual(ids, first("guitar", "intermediate").slice(0, 2).map((c) => c.id));
  });
  it("skips skipped areas", () => {
    assert.deepEqual(focusOptions({ levels: {}, ratings: {} }), []);
  });
});

describe("focus edits", () => {
  it("drops a skipped area's ids", () => {
    const g = first("guitar", "beginner")[0].id, t = first("theory", "beginner")[0].id;
    assert.deepEqual(focusWithout([g, t], "guitar"), [t]);
  });
  it("caps at 3 and toggles off", () => {
    assert.deepEqual(toggleFocus(["a", "b", "c"], "d"), ["a", "b", "c"]);
    assert.deepEqual(toggleFocus(["a", "b", "c"], "b"), ["a", "c"]);
    assert.deepEqual(toggleFocus(["a"], "b"), ["a", "b"]);
  });
});
