import test from "node:test";
import assert from "node:assert/strict";
import { readLevel, readOverrides } from "./levelStorage";

test("readLevel falls back to the default", () => {
  assert.equal(readLevel(null), "standard");
  assert.equal(readLevel("bogus"), "standard");
  assert.equal(readLevel("simple"), "simple");
});

test("readOverrides keeps only valid levels", () => {
  assert.deepEqual(readOverrides('{"looper":"simple","x":"nope"}'), { looper: "simple" });
  assert.deepEqual(readOverrides("{not json"), {});
  assert.deepEqual(readOverrides(null), {});
  assert.deepEqual(readOverrides("[1]"), {});
  assert.deepEqual(readOverrides("null"), {});
});
