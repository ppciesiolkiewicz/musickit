import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaState, stageCommand, toggleFull } from "./commands";
import { CAMERA_CORNER, EMPTY_STAGE, FULL, SCREEN_CORNER, stageReducer, type Stage } from "./layers";

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

test("camera off removes it; clear empties the stage; starting a screen share is the host's job", () => {
  const cam = run(EMPTY_STAGE, "camera-corner");
  assert.equal(run(cam, "camera-off").layers.length, 0);
  assert.equal(run(cam, "clear").layers.length, 0);
  assert.deepEqual(stageCommand(cam, "screen-share", () => "x"), []);
  assert.deepEqual(stageCommand(EMPTY_STAGE, "camera-off", () => "x"), []);
});

const withScreen = (): Stage => stageReducer(EMPTY_STAGE, { type: "addSubject", id: "scr", subject: { kind: "screen" } });

test("screen full and minimize move the screen layer; they never add one (that needs a share)", () => {
  const small = run(withScreen(), "screen-corner");
  assert.deepEqual(small.layers[0].rect, SCREEN_CORNER);
  assert.deepEqual(run(small, "screen-full").layers[0].rect, FULL);
  assert.deepEqual(stageCommand(EMPTY_STAGE, "screen-full", () => "x"), []);
  assert.equal(run(withScreen(), "screen-stop").layers.length, 0);
});

test("mediaState says whether camera and screen are missing, in a corner or full frame", () => {
  assert.deepEqual(mediaState(EMPTY_STAGE), { camera: "none", screen: "none" });
  const s = run(run(EMPTY_STAGE, "camera-corner"), "camera-full");
  assert.deepEqual(mediaState(stageReducer(s, { type: "addSubject", id: "scr", subject: { kind: "screen" } })), { camera: "full", screen: "full" });
  assert.equal(mediaState(run(s, "camera-corner")).camera, "corner");
  // anything that is not exactly the whole frame counts as minimized
  assert.equal(mediaState(stageReducer(s, { type: "move", id: "new", dx: 0.01, dy: 0 })).camera, "corner");
});

test("toggleFull flips between full frame and the corner", () => {
  assert.equal(toggleFull("camera", { camera: "corner", screen: "none" }), "camera-full");
  assert.equal(toggleFull("camera", { camera: "full", screen: "none" }), "camera-corner");
  assert.equal(toggleFull("camera", { camera: "none", screen: "none" }), "camera-full");
  assert.equal(toggleFull("screen", { camera: "none", screen: "full" }), "screen-corner");
  assert.equal(toggleFull("screen", { camera: "none", screen: "none" }), null);
});
