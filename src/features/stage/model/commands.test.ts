import { test } from "node:test";
import assert from "node:assert/strict";
import { stageCommand } from "./commands";
import { CAMERA_CORNER, EMPTY_STAGE, FULL, stageReducer, type Stage } from "./layers";

const run = (s: Stage, cmd: Parameters<typeof stageCommand>[1]) => stageCommand(s, cmd, () => "new").reduce(stageReducer, s);

test("camera full adds a camera when there is none, full frame", () => {
  const s = run(EMPTY_STAGE, "camera-full");
  assert.equal(s.layers.length, 1);
  assert.deepEqual(s.layers[0].subject, { kind: "camera" });
  assert.deepEqual(s.layers[0].rect, FULL);
});

test("camera corner moves the existing camera back to the corner, never a second one", () => {
  const full = run(EMPTY_STAGE, "camera-full");
  const s = run(full, "camera-corner");
  assert.equal(s.layers.length, 1);
  assert.deepEqual(s.layers[0].rect, CAMERA_CORNER);
  assert.equal(s.selected, "new");
});

test("camera off removes it; clear empties the stage; screen commands change nothing here", () => {
  const cam = run(EMPTY_STAGE, "camera-corner");
  assert.equal(run(cam, "camera-off").layers.length, 0);
  assert.equal(run(cam, "clear").layers.length, 0);
  assert.deepEqual(stageCommand(cam, "screen-share", () => "x"), []);
  assert.deepEqual(stageCommand(EMPTY_STAGE, "camera-off", () => "x"), []);
});
