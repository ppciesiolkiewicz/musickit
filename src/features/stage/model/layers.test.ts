import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { CAMERA_CORNER, EMPTY_STAGE, FULL, KEEP_IN, MIN_SIZE, addSubject, clampRect, defaultRect, sanitiseStage, stageReducer, type Layer, type Stage } from "./layers";
import type { Subject } from "./subject";

const ids = ["scale", "chords", "circle", "keys", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);
const chord: Subject = { kind: "chord", symbol: "E6" };
const scale: Subject = { kind: "plugin", plugin: "scale", key: EMPTY_KEY };
const layer = (id: string, subject: Subject = chord): Layer => ({ id, subject, rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, visible: true });
const withLayers = (...layers: Layer[]): Stage => ({ ...EMPTY_STAGE, layers });

test("clampRect keeps a minimum size and lets at most w - KEEP_IN hang off an edge", () => {
  const r = clampRect({ x: -1, y: -1, w: 0.01, h: 0.01 });
  near(r.w, MIN_SIZE);
  near(r.h, MIN_SIZE);
  near(r.x, -(MIN_SIZE - KEEP_IN));
  near(r.y, -(MIN_SIZE - KEEP_IN));
  near(clampRect({ x: 0.98, y: 0.5, w: 0.5, h: 0.3 }).x, 1 - KEEP_IN);
  const big = clampRect({ x: 0, y: 0, w: 3, h: 2 });
  assert.equal(big.w, 1);
  assert.equal(big.h, 1);
});

test("add then remove leaves no layers; removing the selected one clears the selection", () => {
  let s = stageReducer(EMPTY_STAGE, { type: "add", layer: layer("a") });
  s = stageReducer(s, { type: "select", id: "a" });
  s = stageReducer(s, { type: "remove", id: "a" });
  assert.deepEqual(s.layers, []);
  assert.equal(s.selected, null);
});

test("raise moves a layer to the top, lower one step down", () => {
  const s = withLayers(layer("a"), layer("b"), layer("c"));
  assert.deepEqual(stageReducer(s, { type: "raise", id: "a" }).layers.map((l) => l.id), ["b", "c", "a"]);
  assert.deepEqual(stageReducer(s, { type: "lower", id: "c" }).layers.map((l) => l.id), ["a", "c", "b"]);
  assert.deepEqual(stageReducer(s, { type: "lower", id: "a" }).layers.map((l) => l.id), ["a", "b", "c"]);
});

test("swap keeps the id and rect and replaces the subject", () => {
  const s = stageReducer(withLayers(layer("a")), { type: "swap", id: "a", subject: scale });
  assert.equal(s.layers[0].id, "a");
  assert.deepEqual(s.layers[0].rect, layer("a").rect);
  assert.deepEqual(s.layers[0].subject, scale);
});

test("move and resize go through clampRect", () => {
  const moved = stageReducer(withLayers(layer("a")), { type: "move", id: "a", dx: 5, dy: 0 });
  near(moved.layers[0].rect.x, 1 - KEEP_IN);
  const shrunk = stageReducer(withLayers(layer("a")), { type: "resize", id: "a", dw: -1, dh: -1 });
  near(shrunk.layers[0].rect.w, MIN_SIZE);
});

test("toggle hides and shows; clear empties the stage", () => {
  const s = stageReducer(withLayers(layer("a")), { type: "toggle", id: "a" });
  assert.equal(s.layers[0].visible, false);
  assert.deepEqual(stageReducer(s, { type: "clear" }).layers, []);
});

test("setStageKey re-keys key-aware layers, never the chord, and sets the stage key", () => {
  const e = { tonicPc: 4, family: 0, mode: 5 };
  const s0 = withLayers(
    layer("chord"),
    layer("p", scale),
    layer("pos", { kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: 0 }),
    layer("band", { kind: "band", key: EMPTY_KEY }),
    layer("sec", { kind: "section", section: "chords", key: EMPTY_KEY }),
  );
  const s = stageReducer(s0, { type: "setStageKey", key: e });
  assert.deepEqual(s.key, e);
  assert.deepEqual(s.layers[0].subject, chord);
  for (const l of s.layers.slice(1)) assert.deepEqual((l.subject as { key: unknown }).key, e);
  // widgets keep their own key between Key-widget changes
  const a = { tonicPc: 9, family: 0, mode: 1 };
  const swapped = stageReducer(s, { type: "swap", id: "p", subject: { kind: "plugin", plugin: "scale", key: a } });
  assert.deepEqual((swapped.layers[1].subject as { key: unknown }).key, a);
  assert.deepEqual((swapped.layers[2].subject as { key: unknown }).key, e);
});

test("addSubject: one camera, one screen, one key; screen at the bottom, camera above it, widgets above both", () => {
  let s = addSubject(EMPTY_STAGE, "w", chord);
  s = addSubject(s, "cam", { kind: "camera" });
  assert.deepEqual(s.layers.map((l) => l.id), ["cam", "w"]);
  s = addSubject(s, "scr", { kind: "screen" });
  assert.deepEqual(s.layers.map((l) => l.id), ["scr", "cam", "w"]);
  const again = addSubject(s, "cam2", { kind: "camera" });
  assert.equal(again.layers.length, 3);
  assert.equal(again.selected, "cam");
  s = addSubject(s, "k", { kind: "key" });
  assert.equal(addSubject(s, "k2", { kind: "key" }).layers.filter((l) => l.subject.kind === "key").length, 1);
  assert.deepEqual(s.layers.find((l) => l.id === "cam")!.rect, CAMERA_CORNER);
  assert.deepEqual(s.layers.find((l) => l.id === "scr")!.rect, FULL);
  assert.equal(s.selected, "k");
});

test("camera presets are just rects", () => {
  let s = addSubject(EMPTY_STAGE, "cam", { kind: "camera" });
  s = stageReducer(s, { type: "setRect", id: "cam", rect: FULL });
  assert.deepEqual(s.layers[0].rect, FULL);
  s = stageReducer(s, { type: "setRect", id: "cam", rect: CAMERA_CORNER });
  assert.deepEqual(s.layers[0].rect, CAMERA_CORNER);
});

test("defaultRect offsets new widgets so they do not stack exactly", () => {
  const a = defaultRect(chord, []);
  const b = defaultRect(chord, [{ ...layer("a"), rect: a }]);
  near(b.x - a.x, 0.03);
  near(b.y - a.y, 0.03);
});

test("sanitiseStage drops junk, unknown plugins, duplicate ids, second cameras, and clamps rects", () => {
  assert.deepEqual(sanitiseStage("junk", ids), EMPTY_STAGE);
  assert.deepEqual(sanitiseStage(null, ids), EMPTY_STAGE);
  const good = layer("a");
  const s = sanitiseStage(
    {
      layers: [
        good,
        { id: "x", subject: { kind: "plugin", plugin: "gone", key: EMPTY_KEY }, rect: good.rect, visible: true },
        { ...good, subject: scale },
        { id: "c1", subject: { kind: "camera" }, rect: CAMERA_CORNER, visible: true },
        { id: "c2", subject: { kind: "camera" }, rect: CAMERA_CORNER, visible: true },
        { id: "far", subject: chord, rect: { x: 9, y: 0, w: 0.2, h: 0.2 }, visible: "yes" },
      ],
      selected: "gone",
      key: { tonicPc: 4, family: 0, mode: 0 },
    },
    ids,
  );
  assert.deepEqual(s.layers.map((l) => l.id), ["a", "c1", "far"]);
  near(s.layers[2].rect.x, 1 - KEEP_IN);
  assert.equal(s.layers[2].visible, true);
  assert.equal(s.selected, null);
  assert.deepEqual(s.key, { tonicPc: 4, family: 0, mode: 0 });
});
