import { test } from "node:test";
import assert from "node:assert/strict";
import { bubblePlacement, refOf } from "./placement";

test("the bubble hides where it would cover a tool's controls, and on dev pages", () => {
  assert.equal(bubblePlacement("/looper"), "hide");
  assert.equal(bubblePlacement("/tuner"), "hide");
  assert.equal(bubblePlacement("/dev/messages"), "hide");
  assert.equal(bubblePlacement("/feedback"), "hide");
  assert.equal(bubblePlacement("/plan"), "show");
  assert.equal(bubblePlacement("/"), "show");
  assert.equal(bubblePlacement("/course/3"), "show");
});

test("the ref names the course section; other pages put nothing in the URL to name", () => {
  assert.equal(refOf("/course/3", "#triads"), "course/3#triads");
  assert.equal(refOf("/course/3", ""), "course/3");
  assert.equal(refOf("/plan", ""), undefined);
  assert.equal(refOf("/", ""), undefined);
});
