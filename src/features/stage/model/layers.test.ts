import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { CAMERA_CORNER, DEFAULT_VIEW, EMPTY_STAGE, FULL, KEEP_IN, MAX_ZOOM, MIN_SIZE, addSubject, clampRect, defaultRect, panView, resizeFrom, sanitiseStage, stageReducer, zoomAt, type Layer, type Stage } from "./layers";
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

test("selecting a widget brings it to the top; camera and screen share keep their place", () => {
  const s = withLayers(layer("a"), layer("b"), layer("cam", { kind: "camera" }), layer("c"));
  assert.deepEqual(stageReducer(s, { type: "select", id: "a" }).layers.map((l) => l.id), ["b", "cam", "c", "a"]);
  assert.deepEqual(stageReducer(s, { type: "select", id: "cam" }).layers.map((l) => l.id), ["a", "b", "cam", "c"]);
  assert.equal(stageReducer(s, { type: "select", id: "cam" }).selected, "cam");
  // already on top: the same stage comes back, so dragging (which selects on every press) does no extra work
  const top = stageReducer(s, { type: "select", id: "c" });
  assert.equal(top.layers, s.layers);
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

test("resizing from a corner keeps the opposite corner where it was", () => {
  const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
  const nw = resizeFrom(r, "nw", 0.1, 0.05);
  near(nw.x, 0.3); near(nw.y, 0.25); near(nw.x + nw.w, 0.6); near(nw.y + nw.h, 0.6);
  const ne = resizeFrom(r, "ne", 0.1, -0.1);
  near(ne.x, 0.2); near(ne.w, 0.5); near(ne.y, 0.1); near(ne.y + ne.h, 0.6);
  const sw = resizeFrom(r, "sw", -0.1, 0.1);
  near(sw.x, 0.1); near(sw.w, 0.5); near(sw.y, 0.2); near(sw.h, 0.5);
  const se = resizeFrom(r, "se", 0.1, 0.1);
  near(se.x, 0.2); near(se.w, 0.5); near(se.h, 0.5);
});

test("a corner dragged past its opposite stops at the minimum size, the opposite corner still fixed", () => {
  const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
  const nw = resizeFrom(r, "nw", 0.9, 0.9);
  near(nw.w, MIN_SIZE); near(nw.h, MIN_SIZE); near(nw.x + nw.w, 0.6); near(nw.y + nw.h, 0.6);
});

test("zoomAt zooms around the pointer: the point under it stays under it", () => {
  const v = zoomAt(DEFAULT_VIEW, 2, 0.75, 0.75);
  assert.equal(v.zoom, 2);
  // content point under the pointer before: 0.75; after: cx + (0.75 - 0.5) / 2
  near(v.cx + (0.75 - 0.5) / v.zoom, 0.75);
  near(v.cy + (0.75 - 0.5) / v.zoom, 0.75);
});

test("zoom stays between 1 and MAX_ZOOM, and the view never shows past the content's edges", () => {
  assert.equal(zoomAt(DEFAULT_VIEW, 0.5, 0.5, 0.5).zoom, 1);
  assert.equal(zoomAt(DEFAULT_VIEW, 100, 0.5, 0.5).zoom, MAX_ZOOM);
  const v = zoomAt(DEFAULT_VIEW, 2, 1, 1);
  assert.ok(v.cx <= 1 - 0.5 / v.zoom + 1e-9 && v.cy <= 1 - 0.5 / v.zoom + 1e-9);
  const back = zoomAt(v, 0.5, 0, 0);
  assert.deepEqual(back, DEFAULT_VIEW);
});

test("panView moves a zoomed view and stops at the edges; at zoom 1 it does nothing", () => {
  const z = zoomAt(DEFAULT_VIEW, 4, 0.5, 0.5);
  const p = panView(z, 0.1, 0);
  near(p.cx, 0.6);
  near(panView(z, 5, 5).cx, 1 - 0.5 / 4);
  assert.deepEqual(panView(DEFAULT_VIEW, 0.3, 0.3), DEFAULT_VIEW);
});

test("setView stores a layer's zoom; sanitiseStage keeps good views and drops bad ones", () => {
  const v = zoomAt(DEFAULT_VIEW, 2, 0.6, 0.4);
  const s = stageReducer(withLayers(layer("a")), { type: "setView", id: "a", view: v });
  assert.deepEqual(s.layers[0].view, v);
  assert.deepEqual(sanitiseStage(JSON.parse(JSON.stringify(s)), ids).layers[0].view, v);
  const bad = sanitiseStage({ layers: [{ ...layer("a"), view: { zoom: "x" } }] }, ids);
  assert.equal(bad.layers[0].view, undefined);
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

test("the addSubject action does what addSubject does", () => {
  const s = stageReducer(EMPTY_STAGE, { type: "addSubject", id: "cam", subject: { kind: "camera" } });
  assert.deepEqual(s, addSubject(EMPTY_STAGE, "cam", { kind: "camera" }));
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
