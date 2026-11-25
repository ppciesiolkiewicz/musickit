import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FACE, readFace } from "./settings";

test("readFace: unreadable falls back to the default", () => {
  assert.deepEqual(readFace(null), DEFAULT_FACE);
  assert.deepEqual(readFace("x"), DEFAULT_FACE);
});

test("readFace: keeps known effects in order, clamps strength, fills missing ones", () => {
  const f = readFace({ effects: ["slim", "nope", "smooth"], strength: { smooth: 5, light: -1, eyes: "x" } });
  assert.deepEqual(f.effects, ["smooth", "slim"]);
  assert.deepEqual(f.strength, { smooth: 2, light: 0, eyes: 1, slim: 1 });
});
