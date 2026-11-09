import { test } from "node:test";
import assert from "node:assert/strict";
import { createSettle } from "./settle";

const clock = (state = "suspended", currentTime = 0, baseLatency = 0.01) => ({ state, currentTime, baseLatency });

test("a context that is not running has its whole wait to come", () => {
  const c = clock();
  const s = createSettle(c, 0.2);
  assert.equal(s.lead(), 0.2);
  assert.equal(s.startIn(), 0.2);
});

test("the wait runs from the moment it is seen running, even before statechange fires", () => {
  const c = clock("suspended", 3);
  const s = createSettle(c, 0.2);
  s.lead();
  c.state = "running";
  assert.ok(Math.abs(s.lead() - 0.2) < 1e-9);
  c.currentTime = 3.15;
  assert.ok(Math.abs(s.lead() - 0.05) < 1e-9);
  c.currentTime = 3.3;
  assert.equal(s.lead(), 0);
});

test("once settled, a sound starts one audio buffer ahead, kept within limits", () => {
  const c = clock("running", 1);
  const s = createSettle(c, 0.2);
  s.lead();
  c.currentTime = 2;
  assert.equal(s.startIn(), 0.01);
  c.baseLatency = 0;
  assert.equal(s.startIn(), 0.005);
  c.baseLatency = 0.5;
  assert.equal(s.startIn(), 0.05);
});

test("suspending and resuming starts the wait again", () => {
  const c = clock("running", 1);
  const s = createSettle(c, 0.2);
  s.lead();
  c.currentTime = 2;
  assert.equal(s.lead(), 0);
  c.state = "interrupted";
  assert.equal(s.lead(), 0.2);
  c.state = "running";
  assert.ok(Math.abs(s.lead() - 0.2) < 1e-9);
});

test("a hold delays a settled output and never shortens a longer wait", () => {
  const c = clock("running", 1);
  const s = createSettle(c, 0.2);
  s.hold(0.1);
  assert.ok(Math.abs(s.lead() - 0.2) < 1e-9);
  c.currentTime = 2;
  assert.equal(s.lead(), 0);
  s.hold(0.1);
  assert.ok(Math.abs(s.lead() - 0.1) < 1e-9);
  assert.ok(Math.abs(s.startIn() - 0.1) < 1e-9);
});

test("a reopened output waits again without the context stopping", () => {
  const c = clock("running", 1);
  const s = createSettle(c, 0.2);
  s.lead();
  c.currentTime = 2;
  assert.equal(s.lead(), 0);
  s.restart();
  assert.ok(Math.abs(s.lead() - 0.2) < 1e-9);
});
