import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { atLeast, effectiveLevel, isLevel, resolveLevel, stepDown, stepUp } from "./levels";

describe("levels", () => {
  it("atLeast compares order", () => {
    assert.equal(atLeast("standard", "simple"), true);
    assert.equal(atLeast("simple", "standard"), false);
    assert.equal(atLeast("simple", "simple"), true);
  });
  it("isLevel validates", () => {
    assert.equal(isLevel("full"), false);
    assert.equal(isLevel(null), false);
    assert.equal(isLevel("simple"), true);
  });
  it("effectiveLevel prefers the page override", () => {
    assert.equal(effectiveLevel("simple", "standard"), "standard");
    assert.equal(effectiveLevel("simple", null), "simple");
  });
  it("resolveLevel lets a pin win over the global level and the page override", () => {
    assert.equal(resolveLevel("simple", null, "standard"), "standard");
    assert.equal(resolveLevel("simple", "simple", "standard"), "standard");
    assert.equal(resolveLevel("standard", null, "simple"), "simple");
    assert.equal(resolveLevel("simple", "standard", null), "standard");
    assert.equal(resolveLevel("simple", null, null), "simple");
  });
  it("steps clamp at the ends", () => {
    assert.equal(stepUp("standard"), "standard");
    assert.equal(stepUp("simple"), "standard");
    assert.equal(stepDown("simple"), "simple");
    assert.equal(stepDown("standard"), "simple");
  });
});
