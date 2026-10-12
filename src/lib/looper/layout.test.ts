import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LOOPS_PER_GROUP, bottomRow, freeSpot, spotInGroup, spotOutside, LOOP_R, MIN_GROUP_W, STAGE_H, STAGE_W, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot, resizeRect, MIN_GROUP_H, CARD_W, CARD_TOP, LOOP_CARD_H, SEQ_CARD_H, VIEW_W, VIEW_H, arrangeStage, type GroupLayout } from "./layout";

/** The box a card covers on the stage, from its circle centre. */
const cardBox = (p: { x: number; y: number }, h = LOOP_CARD_H) => ({ x: p.x - CARD_W / 2, y: p.y - CARD_TOP, w: CARD_W, h });
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: { x: number; y: number; w: number; h: number }, g: { x: number; y: number; w: number; h: number }) => a.x >= g.x && a.y >= g.y && a.x + a.w <= g.x + g.w && a.y + a.h <= g.y + g.h;
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
    assert.equal(p.x, CARD_W / 2);
    assert.equal(p.y + LOOP_CARD_H - CARD_TOP, STAGE_H, "the whole card stays on the stage");
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
      assert.ok(a.y - loop.y >= LOOP_CARD_H, "under the last loop and its controls");
    });
  });
  it("gives every default card its own room, whole inside its group, and the groups fit the view", () => {
    const gs = defaultGroups();
    const cards = gs.flatMap((g, i) => [
      ...Array.from({ length: LOOPS_PER_GROUP }, (_, k) => ({ g, box: cardBox(defaultSpot(gs, i * LOOPS_PER_GROUP + k)) })),
      ...bottomRow(g, 2).map((p) => ({ g, box: cardBox(p, SEQ_CARD_H) })),
    ]);
    cards.forEach((c, i) => {
      assert.ok(inside(c.box, c.g), `card ${i} inside its group`);
      cards.slice(i + 1).forEach((d, j) => assert.ok(!overlap(c.box, d.box), `cards ${i} and ${i + 1 + j} apart`));
    });
    gs.forEach((g, i) => gs.slice(i + 1).forEach((h) => assert.ok(!overlap(g, h), "groups apart")));
    gs.forEach((g) => assert.ok(g.x + g.w <= VIEW_W && g.y + g.h <= VIEW_H, "in view"));
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
    const taken = [defaultSpot(groups, LOOPS_PER_GROUP)];
    const p = spotInGroup(groups, "g2", taken);
    assert.equal(containingGroup(groups, p.x, p.y), "g2");
    assert.ok(!overlap(cardBox(p), cardBox(taken[0])));
  });
  it("puts a new loop at its default spot, or elsewhere in that group when a circle is there", () => {
    const groups = defaultGroups();
    const index = groups.length * LOOPS_PER_GROUP;
    const d = defaultSpot(groups, index);
    assert.deepEqual(freeSpot(groups, index, []), d);
    const p = freeSpot(groups, index, [d]);
    assert.equal(containingGroup(groups, p.x, p.y), containingGroup(groups, d.x, d.y));
    assert.ok(!overlap(cardBox(p), cardBox(d)));
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
    groups.forEach((g) => assert.ok(!overlap(cardBox(p!), g), "the whole card is clear of the groups"));
    assert.ok(p!.y - CARD_TOP + LOOP_CARD_H <= VIEW_H, "in view");
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

describe("auto layout of the stage", () => {
  // a cramped stage: groups overlapping, loops and sequencers piled up, one loop outside every group
  const groups: GroupLayout[] = [
    { id: "b", x: 400, y: 40, w: 200, h: 300 },
    { id: "a", x: 10, y: 10, w: 500, h: 200 },
  ];
  const items = [
    ...[0, 1, 2, 3, 4].map((id) => ({ kind: "loop" as const, id, groupId: "a" })),
    { kind: "loop" as const, id: 5, groupId: "b" },
    { kind: "seq" as const, id: "s1", groupId: "a" },
    { kind: "seq" as const, id: "s2", groupId: "a" },
    { kind: "seq" as const, id: "s3", groupId: "b" },
    { kind: "loop" as const, id: 6, groupId: null },
  ];
  const plan = arrangeStage(groups, items);
  const g = (id: string) => plan.groups.find((x) => x.id === id)!;
  const box = (id: string | number) => {
    const s = plan.spots.find((p) => p.id === id)!;
    return cardBox(s, s.kind === "seq" ? SEQ_CARD_H : LOOP_CARD_H);
  };
  it("puts the groups side by side in their order on the stage, apart", () => {
    assert.deepEqual(plan.groups.map((x) => x.id), ["a", "b"]);
    assert.ok(g("a").x + g("a").w < g("b").x);
    assert.equal(g("a").y, g("b").y);
    assert.equal(g("a").h, g("b").h, "a row of groups shares its height");
  });
  it("keeps every card whole in its own group, never on another card", () => {
    items.filter((i) => i.groupId).forEach((i) => {
      assert.ok(inside(box(i.id), g(i.groupId!)), `${i.id} inside ${i.groupId}`);
      const s = plan.spots.find((p) => p.id === i.id)!;
      assert.equal(containingGroup(plan.groups, s.x, s.y), i.groupId);
    });
    const all = items.map((i) => box(i.id));
    all.forEach((a, i) => all.slice(i + 1).forEach((b, j) => assert.ok(!overlap(a, b), `cards ${i} and ${i + 1 + j}`)));
  });
  it("grows a group to fit its cards: loops in rows, sequencers below them", () => {
    assert.ok(Math.max(...[0, 1, 2, 3, 4].map((id) => box(id).y)) < box("s1").y);
    assert.equal(box("s1").y, box("s2").y);
  });
  it("puts a card that was outside every group under the groups, still outside", () => {
    const s = plan.spots.find((p) => p.id === 6)!;
    assert.equal(containingGroup(plan.groups, s.x, s.y), null);
    plan.groups.forEach((x) => assert.ok(!overlap(box(6), x)));
  });
  it("matches the default layout for the default groups", () => {
    const gs = defaultGroups();
    const def = arrangeStage(gs, gs.flatMap((x, i) => Array.from({ length: LOOPS_PER_GROUP }, (_, k) => ({ kind: "loop" as const, id: i * LOOPS_PER_GROUP + k, groupId: x.id }))));
    assert.deepEqual(def.groups, gs);
    def.spots.forEach((p) => assert.deepEqual({ x: p.x, y: p.y }, defaultSpot(gs, Number(p.id))));
  });
});
