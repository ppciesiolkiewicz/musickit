import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { CAMERA_CORNER, DEFAULT_VIEW, EMPTY_STAGE, FRAME_ASPECT, FULL, KEEP_IN, MAX_ZOOM, MIN_SIZE, addSubject, drawZ, paintOrder, clampRect, defaultRect, fillRect, fixedRect, hasAspect, panView, resizeFrom, resizeKeepingShape, withAspect, sanitiseStage, stageReducer, zoomAt, type Layer, type Stage } from "./layers";
import type { Subject } from "./subject";

const ids = ["scale", "chords", "circle", "keys", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);
const chord: Subject = { kind: "chord", symbol: "E6" };
const scale: Subject = { kind: "plugin", plugin: "scale", key: EMPTY_KEY };
const layer = (id: string, subject: Subject = chord): Layer => ({ id, subject, rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, visible: true, z: 0 });
/** a stage painted in list order */
const withLayers = (...layers: Layer[]): Stage => ({ ...EMPTY_STAGE, layers: layers.map((l, z) => ({ ...l, z })) });
const listIds = (s: Stage) => s.layers.map((l) => l.id);
const paintIds = (s: Stage) => paintOrder(s.layers).map((l) => l.id);

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

test("raise moves a layer to the top, lower one step down: its z changes, never its place in the list", () => {
  const s = withLayers(layer("a"), layer("b"), layer("c"));
  const raised = stageReducer(s, { type: "raise", id: "a" });
  assert.deepEqual(paintIds(raised), ["b", "c", "a"]);
  assert.deepEqual(listIds(raised), ["a", "b", "c"]);
  assert.deepEqual(paintIds(stageReducer(raised, { type: "lower", id: "a" })), ["b", "a", "c"]);
  assert.deepEqual(paintIds(stageReducer(s, { type: "lower", id: "c" })), ["a", "c", "b"]);
  assert.deepEqual(paintIds(stageReducer(s, { type: "lower", id: "a" })), ["a", "b", "c"]);
});

test("selecting a widget brings it to the top z and keeps the list; camera and screen share keep their z", () => {
  const s = withLayers(layer("a"), layer("b"), layer("cam", { kind: "camera" }), layer("c"));
  const picked = stageReducer(s, { type: "select", id: "a" });
  assert.equal(picked.selected, "a");
  assert.deepEqual(paintIds(picked), ["b", "cam", "c", "a"]);
  assert.deepEqual(listIds(picked), ["a", "b", "cam", "c"]);
  assert.deepEqual(paintIds(stageReducer(s, { type: "select", id: "cam" })), ["a", "b", "cam", "c"]);
  // already on top: the same layers come back, so dragging (which selects on every press) does no extra work
  assert.equal(stageReducer(s, { type: "select", id: "c" }).layers, s.layers);
  assert.equal(stageReducer(s, { type: "select", id: "missing" }), s);
});

test("removing a layer keeps the others' z 0..n-1", () => {
  const s = stageReducer(stageReducer(withLayers(layer("a"), layer("b"), layer("c")), { type: "raise", id: "a" }), { type: "remove", id: "b" });
  assert.deepEqual(s.layers.map((l) => [l.id, l.z]), [["a", 1], ["c", 0]]);
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

test("setStageKey moves every key-aware layer to the master, never the chord, and sets the stage key", () => {
  const e = { tonicPc: 4, family: 0, mode: 5 };
  const s0 = withLayers(
    layer("chord"),
    layer("p", scale),
    layer("pos", { kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: 0 }),
    layer("band", { kind: "band", key: EMPTY_KEY }),
    layer("sec", { kind: "section", section: "chords", key: EMPTY_KEY }),
    layer("neck", { kind: "neck", key: EMPTY_KEY }),
    layer("caged", { kind: "caged", key: EMPTY_KEY, shape: "E" }),
  );
  const s = stageReducer(s0, { type: "setStageKey", key: e });
  assert.deepEqual(s.key, e);
  assert.deepEqual(s.layers[0].subject, chord);
  for (const l of s.layers.slice(1)) assert.deepEqual((l.subject as { key: unknown }).key, e);
});

test("setStageKey keeps a pinned mode and moves its root, so modes of one root can be compared", () => {
  const dorian = { tonicPc: 9, family: 0, mode: 1 };
  const phrygian = { tonicPc: 9, family: 0, mode: 2 };
  const s0 = withLayers(layer("d", { kind: "neck", key: dorian, pinned: ["scale"] }), layer("p", { kind: "neck", key: phrygian, pinned: ["scale"] }), layer("f", { kind: "neck", key: dorian }));
  const s = stageReducer(s0, { type: "setStageKey", key: { tonicPc: 0, family: 0, mode: 0 } });
  assert.deepEqual(s.layers.map((l) => (l.subject as { key: unknown }).key), [{ ...dorian, tonicPc: 0 }, { ...phrygian, tonicPc: 0 }, { tonicPc: 0, family: 0, mode: 0 }]);
});

test("addSubject: one camera, one screen, one key; screen at the bottom, camera above it, widgets above both", () => {
  let s = addSubject(EMPTY_STAGE, "w", chord);
  s = addSubject(s, "cam", { kind: "camera" });
  assert.deepEqual(paintIds(s), ["cam", "w"]);
  s = addSubject(s, "scr", { kind: "screen" });
  assert.deepEqual(paintIds(s), ["scr", "cam", "w"]);
  assert.deepEqual(listIds(s), ["w", "cam", "scr"]);
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

test("a saved stage keeps its z; one saved before z paints in list order", () => {
  const raised = stageReducer(withLayers(layer("a"), layer("b"), layer("c")), { type: "raise", id: "a" });
  const back = sanitiseStage(JSON.parse(JSON.stringify(raised)), ids);
  assert.deepEqual(listIds(back), ["a", "b", "c"]);
  assert.deepEqual(paintIds(back), ["b", "c", "a"]);
  const old = sanitiseStage({ layers: [layer("a"), layer("b")].map((l) => ({ ...l, z: undefined })) }, ids);
  assert.deepEqual(old.layers.map((l) => l.z), [0, 1]);
});

test("the logo and the url exist at most once", () => {
  let s = addSubject(EMPTY_STAGE, "a", { kind: "logo" });
  s = addSubject(s, "b", { kind: "logo" });
  s = addSubject(s, "c", { kind: "url" });
  s = addSubject(s, "d", { kind: "url" });
  assert.deepEqual(s.layers.map((l) => l.id), ["a", "c"]);
  assert.equal(s.selected, "c");
});

test("the logo and the url sit in the top-right corner and never move, resize or zoom", () => {
  let s = addSubject(EMPTY_STAGE, "a", { kind: "logo" });
  s = addSubject(s, "b", { kind: "url" });
  const logo = fixedRect({ kind: "logo" })!, url = fixedRect({ kind: "url" })!;
  assert.deepEqual(s.layers.map((l) => l.rect), [logo, url]);
  assert.ok(logo.x + logo.w <= 1 && url.x + url.w <= 1 && url.y >= logo.y + logo.h, "top right, the address under the logo");
  for (const a of [
    { type: "move", id: "a", dx: -0.2, dy: 0.2 },
    { type: "resize", id: "a", dw: 0.1, dh: 0.1 },
    { type: "setRect", id: "b", rect: { x: 0, y: 0, w: 0.5, h: 0.5 } },
    { type: "setView", id: "a", view: { zoom: 2, cx: 0.5, cy: 0.5 } },
  ] as const) s = stageReducer(s, a);
  assert.deepEqual(s.layers.map((l) => l.rect), [logo, url]);
  assert.equal(s.layers[0].view, undefined);
  // they can still be hidden and removed
  s = stageReducer(s, { type: "toggle", id: "a" });
  assert.equal(s.layers[0].visible, false);
  assert.deepEqual(stageReducer(s, { type: "remove", id: "b" }).layers.map((l) => l.id), ["a"]);
});

test("a logo saved somewhere else comes back to its corner", () => {
  const s = sanitiseStage({ layers: [{ id: "a", subject: { kind: "logo" }, rect: { x: 0.1, y: 0.5, w: 0.3, h: 0.2 }, visible: true }] }, []);
  assert.deepEqual(s.layers[0].rect, fixedRect({ kind: "logo" }));
});

const shape = (r: { w: number; h: number }) => (r.w * FRAME_ASPECT) / r.h;

test("withAspect gives a rect its content's shape, keeping its width and corner where it fits", () => {
  const r = withAspect({ x: 0.1, y: 0.1, w: 0.4, h: 0.4 }, 2);
  near(r.x, 0.1);
  near(r.y, 0.1);
  near(r.w, 0.4);
  near(shape(r), 2);
  assert.ok(hasAspect(r, 2) && !hasAspect(r, 1.5));
  // a tall widget too wide for the frame's height shrinks to fit it, still in shape
  const tall = withAspect({ x: 0, y: 0, w: 0.9, h: 0.2 }, 0.5);
  near(tall.h, 1);
  near(shape(tall), 0.5);
});

test("resizeKeepingShape keeps the shape and the opposite corner", () => {
  const r = withAspect({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, 1.5);
  const big = resizeKeepingShape(r, "nw", -0.1, 0, 1.5);
  near(shape(big), 1.5);
  near(big.x + big.w, r.x + r.w);
  near(big.y + big.h, r.y + r.h);
  assert.ok(big.w > r.w);
});

test("toggleFill fills the frame in the content's shape, centred, then goes back; a drag forgets the way back", () => {
  let s = withLayers(layer("a"));
  s = stageReducer(s, { type: "toggleFill", id: "a", aspect: 1 });
  const full = s.layers[0].rect;
  near(full.h, 1);
  near(shape(full), 1);
  near(full.x, (1 - full.w) / 2);
  assert.deepEqual(fillRect(null), FULL);
  const back = stageReducer(s, { type: "toggleFill", id: "a", aspect: 1 });
  assert.deepEqual(back.layers[0].rect, layer("a").rect);
  assert.equal(back.layers[0].restore, undefined);
  const moved = stageReducer(s, { type: "move", id: "a", dx: 0.01, dy: 0 });
  assert.equal(moved.layers[0].restore, undefined);
  // saved and loaded, a filling widget still knows its way back
  assert.deepEqual(sanitiseStage(JSON.parse(JSON.stringify(s)), ids).layers[0].restore, layer("a").rect);
});

test("a pinned widget is drawn over every widget that is not, and unpins", () => {
  let s = withLayers(layer("a"), layer("b"), layer("c"));
  s = stageReducer(s, { type: "togglePin", id: "a" });
  assert.equal(s.layers[0].onTop, true);
  const z = (id: string) => drawZ(s.layers.find((l) => l.id === id)!, s.layers.length);
  assert.ok(z("a") > z("b") && z("a") > z("c"));
  // raising another widget does not put it over the pinned one
  s = stageReducer(s, { type: "raise", id: "b" });
  assert.ok(z("a") > z("b"));
  s = stageReducer(s, { type: "togglePin", id: "a" });
  assert.equal("onTop" in s.layers[0], false);
  assert.ok(z("a") < z("c"));
});

test("a pin is saved; anything but true is not a pin", () => {
  const raw = { layers: [{ ...layer("a"), onTop: true }, { ...layer("b"), onTop: "yes" }] };
  const s = sanitiseStage(raw, ids);
  assert.equal(s.layers[0].onTop, true);
  assert.equal("onTop" in s.layers[1], false);
});

test("the audio input exists at most once", () => {
  let s = addSubject(EMPTY_STAGE, "m1", { kind: "mic" });
  s = addSubject(s, "m2", { kind: "mic" });
  assert.deepEqual(listIds(s), ["m1"]);
  assert.equal(s.selected, "m1");
});
