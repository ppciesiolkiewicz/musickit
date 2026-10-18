import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { segment } from "./paths";

describe("arrow segments", () => {
  it("a horizontal arrow stops short of both dots", () => {
    assert.deepEqual(segment({ x: 0, y: 0 }, { x: 100, y: 0 }, 10), { x1: 10, y1: 0, x2: 90, y2: 0 });
  });
  it("a vertical arrow stops short of both dots", () => {
    assert.deepEqual(segment({ x: 0, y: 0 }, { x: 0, y: 50 }, 10), { x1: 0, y1: 10, x2: 0, y2: 40 });
  });
  it("dots too close for an arrow give nothing", () => {
    assert.equal(segment({ x: 0, y: 0 }, { x: 15, y: 0 }, 10), null);
  });
});
