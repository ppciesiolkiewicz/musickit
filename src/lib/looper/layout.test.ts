import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bottomRow, spotInGroup, spotOutside, LOOP_R, MIN_GROUP_W, STAGE_H, STAGE_W, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot, resizeRect, MIN_GROUP_H } from "./layout";
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
  it("puts the default loops inside the default groups", () => {
    const gs = defaultGroups();
    assert.equal(gs.length, 5);
    for (let i = 0; i < 8; i++) {
      const s = defaultSpot(gs, i);
      assert.equal(containingGroup(gs, s.x, s.y), gs[i % 5].id, `loop ${i}`);
      assert.ok(s.x <= STAGE_W);
    }
  });
  it("puts sequencers side by side in each default group, below its first loop", () => {
    const gs = defaultGroups();
    gs.forEach((g, i) => {
      const [a, b] = bottomRow(g, 2);
      assert.equal(containingGroup(gs, a.x, a.y), g.id);
      assert.equal(containingGroup(gs, b.x, b.y), g.id);
      assert.ok(b.x - a.x >= LOOP_R * 1.6, "apart");
      const loop = defaultSpot(gs, i);
      assert.ok(a.y - loop.y >= LOOP_R * 3, "under the loop and its controls");
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
