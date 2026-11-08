import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSeen, seenKey, visibleSteps, type TourStep } from "./tour";

const a: TourStep = { target: "a", title: "A", text: "a" };
const b: TourStep = { target: "b", title: "B", text: "b", minLevel: "standard" };
const c: TourStep = { target: "c", title: "C", text: "c" };

test("drops steps above the level", () => {
  assert.deepEqual(visibleSteps([a, b], "simple", () => true), [a]);
  assert.deepEqual(visibleSteps([a, b], "standard", () => true), [a, b]);
});

test("drops steps whose target is absent", () => {
  assert.deepEqual(visibleSteps([a, c], "standard", (t) => t !== "a"), [c]);
});

test("keeps order", () => {
  assert.deepEqual(visibleSteps([c, a, b], "standard", () => true), [c, a, b]);
});

test("returns [] when nothing is visible", () => {
  assert.deepEqual(visibleSteps([a, b], "standard", () => false), []);
});

test("seenKey", () => {
  assert.equal(seenKey("looper"), "musickit.tour.looper");
});

test("parseSeen", () => {
  assert.equal(parseSeen("1"), true);
  assert.equal(parseSeen(null), false);
  assert.equal(parseSeen("x"), false);
});
