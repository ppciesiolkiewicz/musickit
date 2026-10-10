import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LOOPS_PER_GROUP, bottomRow, freeSpot, spotInGroup, spotOutside, LOOP_R, MIN_GROUP_W, STAGE_H, STAGE_W, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot, resizeRect, MIN_GROUP_H } from "./layout";
import { clampParams, defaultParams, sanitiseEffects } from "./effects";

describe("stage layout", () => {
  const groups = [
    { id: "a", x: 0, y: 0, w: 300, h: 300 },
    { id: "b", x: 200, y: 100, w: 300, h: 300 },
  ];
  it("finds the group holding a point, topmost first", () => {
    assert.equal(containingGroup(groups, 50, 50), "a");
    assert.equal(containingGroup(groups, 250, 150), "b"); // overlap: later wins
    assert.equal(containingGroup(groups, 450, 50), null);
  });
  it("keeps groups and loops on the stage", () => {
    const r = clampRect({ x: -20, y: 900, w: 10, h: 5000 });
    assert.equal(r.x, 0);
    assert.equal(r.w, MIN_GROUP_W);
    assert.ok(r.y + r.h <= STAGE_H);
    const p = clampPoint(-5, 99999);
    assert.equal(p.x, LOOP_R);
    assert.equal(p.y, STAGE_H - LOOP_R);
  });
  it("puts the default loops inside the default groups, group after group, clear of each other", () => {
    const gs = defaultGroups();
    assert.equal(gs.length, 5);
    const spots = Array.from({ length: gs.length * LOOPS_PER_GROUP }, (_, i) => defaultSpot(gs, i));
    spots.forEach((s, i) => {
      assert.equal(containingGroup(gs, s.x, s.y), gs[Math.floor(i / LOOPS_PER_GROUP)].id, `loop ${i}`);
      assert.ok(s.x <= STAGE_W);
    });
    spots.forEach((a, i) => spots.slice(i + 1).forEach((b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= LOOP_R * 2, `loops ${i} apart`)));
    // two by two: two columns, two rows
    const first = spots.slice(0, LOOPS_PER_GROUP);
    assert.equal(new Set(first.map((s) => s.x)).size, 2);
    assert.equal(new Set(first.map((s) => s.y)).size, 2);
  });
  it("places later loops round the groups", () => {
    const gs = defaultGroups();
    for (let i = gs.length * LOOPS_PER_GROUP; i < gs.length * LOOPS_PER_GROUP + 5; i++) {
      const s = defaultSpot(gs, i);
      assert.equal(containingGroup(gs, s.x, s.y), gs[i % 5].id, `loop ${i}`);
    }
  });
  it("puts sequencers side by side in each default group, below its loops", () => {
    const gs = defaultGroups();
    gs.forEach((g, i) => {
      const [a, b] = bottomRow(g, 2);
      assert.equal(containingGroup(gs, a.x, a.y), g.id);
      assert.equal(containingGroup(gs, b.x, b.y), g.id);
      assert.ok(b.x - a.x >= LOOP_R * 1.6, "apart");
      const loop = defaultSpot(gs, i * LOOPS_PER_GROUP + LOOPS_PER_GROUP - 1);
      assert.ok(a.y - loop.y >= LOOP_R * 3, "under the last loop and its controls");
    });
  });
});

describe("effects params", () => {
  it("clamps and fills defaults", () => {
    const p = clampParams("tapeDelay", { time: 99999, feedback: -1 });
    assert.equal(p.time, 900);
    assert.equal(p.feedback, 0);
    assert.equal(p.mix, defaultParams("tapeDelay").mix);
  });
  it("sanitises a saved list", () => {
    const list = sanitiseEffects([{ id: "x", kind: "reverb", params: { decay: 100 } }, { kind: "flanger" }, null]);
    assert.equal(list.length, 1);
    assert.equal(list[0].params.decay, 6);
  });
});

describe("placing circles from the diagram", () => {
  it("finds a spot inside a group that is clear of the others", () => {
    const groups = defaultGroups();
    const taken = [{ x: groups[1].x + 20 + LOOP_R, y: groups[1].y + 50 + LOOP_R }];
    const p = spotInGroup(groups, "g2", taken);
    assert.equal(containingGroup(groups, p.x, p.y), "g2");
    assert.ok(Math.hypot(p.x - taken[0].x, p.y - taken[0].y) >= LOOP_R * 1.6);
  });
  it("puts a new loop at its default spot, or elsewhere in that group when a circle is there", () => {
    const groups = defaultGroups();
    const index = groups.length * LOOPS_PER_GROUP;
    const d = defaultSpot(groups, index);
    assert.deepEqual(freeSpot(groups, index, []), d);
    const p = freeSpot(groups, index, [d]);
    assert.equal(containingGroup(groups, p.x, p.y), containingGroup(groups, d.x, d.y));
    assert.ok(Math.abs(p.x - d.x) >= LOOP_R * 2 + 8 || Math.abs(p.y - d.y) >= LOOP_R * 2 + 56);
  });
  it("goes to another group, then outside every group, when a group is full", () => {
    const groups = defaultGroups();
    // fill the first group with circles on a fine grid
    const g = groups[0];
    const full: { x: number; y: number }[] = [];
    for (let y = g.y; y <= g.y + g.h; y += 20) for (let x = g.x; x <= g.x + g.w; x += 20) full.push({ x, y });
    const p = freeSpot(groups, groups.length * LOOPS_PER_GROUP, full);
    assert.notEqual(containingGroup(groups, p.x, p.y), g.id);
    const all: { x: number; y: number }[] = [];
    for (const h of groups) for (let y = h.y; y <= h.y + h.h; y += 20) for (let x = h.x; x <= h.x + h.w; x += 20) all.push({ x, y });
    const q = freeSpot(groups, groups.length * LOOPS_PER_GROUP, all);
    assert.equal(containingGroup(groups, q.x, q.y), null);
  });
  it("leaves room outside the default groups, for the master", () => {
    const groups = defaultGroups();
    const p = spotOutside(groups, []);
    assert.ok(p);
    assert.equal(containingGroup(groups, p!.x, p!.y), null);
  });
  it("reports no spot when groups cover the stage", () => {
    assert.equal(spotOutside([{ id: "a", x: 0, y: 0, w: STAGE_W, h: STAGE_H }], []), null);
  });
});

describe("noise removal", () => {
  it("closes the gate on quiet signal and opens it on loud signal", async () => {
    const { gateCurve, EFFECT_DEFS } = await import("./effects");
    assert.ok(EFFECT_DEFS.denoise);
    const c = gateCurve(-60, 40);
    const at = (e: number) => c[Math.round(((e + 1) / 2) * (c.length - 1))];
    assert.ok(Math.abs(at(0) - 0.01) < 1e-6, "silence is cut by the reduction");
    assert.equal(at(1), 1);
    assert.ok(at(0.5) === 1);
    assert.ok(at(-0.5) === at(0.5), "symmetric");
  });
});

describe("resizing a group from a corner", () => {
  const r = { x: 400, y: 300, w: 300, h: 250 };
  it("keeps the opposite corner fixed", () => {
    assert.deepEqual(resizeRect(r, "se", 50, 20), { x: 400, y: 300, w: 350, h: 270 });
    assert.deepEqual(resizeRect(r, "nw", -50, -20), { x: 350, y: 280, w: 350, h: 270 });
    assert.deepEqual(resizeRect(r, "ne", 50, -20), { x: 400, y: 280, w: 350, h: 270 });
    assert.deepEqual(resizeRect(r, "sw", -50, 20), { x: 350, y: 300, w: 350, h: 270 });
  });
  it("stops at the minimum size without moving the far corner", () => {
    const a = resizeRect(r, "nw", 900, 900);
    assert.equal(a.w, MIN_GROUP_W);
    assert.equal(a.h, MIN_GROUP_H);
    assert.equal(a.x + a.w, 700);
    assert.equal(a.y + a.h, 550);
  });
  it("stays on the stage", () => {
    assert.equal(resizeRect(r, "nw", -9999, -9999).x, 0);
    assert.equal(resizeRect(r, "nw", -9999, -9999).y, 0);
    const b = resizeRect(r, "se", 9999, 9999);
    assert.equal(b.x + b.w, STAGE_W);
    assert.equal(b.y + b.h, STAGE_H);
  });
});
