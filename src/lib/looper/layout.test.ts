import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spotInGroup, spotOutside, LOOP_R, MIN_GROUP_W, STAGE_H, STAGE_W, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot } from "./layout";
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
