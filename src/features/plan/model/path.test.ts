import { test } from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "@/features/plan/intake/topics";
import { PATH, depthOf, levelIndex, levelOfSteps, pathStats, predecessorsOf, slope, slopeIndex, spanOf, stepAt, stepOf } from "./path";
import { LADDERS } from "./ladders";
import type { PlanTool } from "./tools";

/** The 67 concepts from before the path (2026-11-16): every one went into exactly one track. */
const OLD = 67;

test("every old concept is merged into exactly one track", () => {
  const seen = new Map<string, string>();
  for (const t of PATH) for (const id of t.merges) {
    assert.ok(!seen.has(id), `${id} is in ${seen.get(id)} and ${t.id}`);
    seen.set(id, t.id);
  }
  assert.equal(seen.size, OLD);
});

test("track ids are unique; a track sits in a topic of its own area, with the area of what it merges", () => {
  assert.equal(new Set(PATH.map((t) => t.id)).size, PATH.length);
  for (const t of PATH) {
    assert.equal(TOPICS.find((x) => x.id === t.topic)?.area, t.area, t.id);
  }
});

test("a track's steps never go down a level", () => {
  for (const t of PATH) {
    assert.ok(t.steps.length > 0, t.id);
    t.steps.forEach((st, i) => i && assert.ok(levelIndex(st.level) >= levelIndex(t.steps[i - 1].level), `${t.id} step ${i + 1}`));
  }
});

test("ladder steps exist and each is used once; `after` points at a real step no higher than its own", () => {
  const used = new Set<string>();
  for (const t of PATH) for (const st of t.steps) {
    if (st.ladder) {
      const [id, key] = st.ladder.split(":");
      assert.ok(LADDERS.find((l) => l.id === id)?.steps.some((x) => x.key === key), `${t.id}: ${st.ladder}`);
      assert.ok(!used.has(st.ladder), `${st.ladder} used twice`);
      used.add(st.ladder);
    }
    for (const ref of st.after ?? []) {
      const at = stepAt(ref);
      assert.ok(at, `${t.id}: ${ref}`);
      assert.notEqual(at.track.id, t.id, `${t.id}: ${ref} is its own track`);
      assert.ok(levelIndex(at.step.level) <= levelIndex(st.level), `${t.id}: ${ref} is above it`);
    }
  }
});

test("span and counts", () => {
  const triads = PATH.find((t) => t.id === "triads")!;
  assert.deepEqual(spanOf(triads), [1, 3]);
  const caged = PATH.find((t) => t.id === "caged")!;
  assert.ok(spanOf(caged)[0] > spanOf(triads)[0], "triads start before CAGED");
  const n = pathStats(PATH);
  assert.equal(n.merged, OLD);
  assert.ok(n.spanning > n.tracks / 2);
});

test("stepOf reads the hardest ladder step the tools say; none without a ladder or a level", () => {
  const nf = (level: string) => ({ type: "note-finder", level }) as unknown as PlanTool;
  assert.equal(stepOf("notes-on-neck", [nf("new")]), 0);
  assert.equal(stepOf("notes-on-neck", [nf("new"), nf("intermediate")]), 2);
  assert.equal(stepOf("notes-on-neck", [{ type: "note-finder" } as unknown as PlanTool]), null);
  assert.equal(stepOf("triads", [nf("new")]), null);
  assert.equal(stepOf("nope", [nf("new")]), null);
});

test("predecessorsOf: the step before it, then its `after` steps", () => {
  assert.deepEqual(predecessorsOf("open-chords:1"), []);
  assert.deepEqual(predecessorsOf("open-chords:2"), ["open-chords:1"]);
  assert.deepEqual(predecessorsOf("caged:1"), ["barre:3", "pentatonic-positions:1"]);
  assert.deepEqual(predecessorsOf("caged:2"), ["caged:1", "barre:2"]);
  assert.deepEqual(predecessorsOf("triads:1"), ["double-stops:2"]);
});

test("depth: each step is deeper than every step it needs, so the path has no cycle", () => {
  assert.equal(depthOf("open-chords:1"), 0);
  for (const t of PATH) t.steps.forEach((_, i) => {
    const ref = `${t.id}:${i + 1}`;
    for (const p of predecessorsOf(ref)) assert.ok(depthOf(p) < depthOf(ref), `${p} → ${ref}`);
  });
});

test("slope: every step once, each after everything it needs, levels never going down", () => {
  const at = slopeIndex();
  assert.equal(at.size, PATH.reduce((n, t) => n + t.steps.length, 0));
  for (const [ref, i] of at) for (const p of predecessorsOf(ref)) assert.ok(at.get(p)! < i, `${p} → ${ref}`);
  const s = slope();
  s.forEach((x, i) => i && assert.ok(levelIndex(x.level) >= levelIndex(s[i - 1].level)));
});

test("the prerequisites the user named (2026-11-16)", () => {
  const after = (ref: string) => stepAt(ref)!.step.after ?? [];
  assert.ok(after("modes:1").includes("scales:1") && after("modes:1").includes("scales:3"));
  assert.ok(after("singing-modes:1").includes("scales:1"));
  for (const ref of ["major-on-neck:1", "arpeggios:1", "caged:1"]) assert.ok(after(ref).includes("pentatonic-positions:1"), ref);
  assert.ok(after("triads:1").includes("double-stops:2"));
  assert.ok(after("barre:1").includes("triads:1"));
  const at = slopeIndex();
  assert.ok(at.get("double-stops:2")! < at.get("triads:1")! && at.get("triads:1")! < at.get("barre:1")!);
  assert.ok(at.get("pentatonic-positions:1")! < at.get("major-on-neck:1")!);
});

test("mixing steps: never first, never a ladder step, never pointed at by `after`, named Mix", () => {
  const mixes = PATH.flatMap((t) => t.steps.map((st, i) => ({ t, st, i }))).filter((x) => x.st.mix);
  assert.equal(mixes.length, 33);
  for (const { t, st, i } of mixes) {
    assert.ok(i > 0 && !t.steps[i - 1].mix, `${t.id}:${i + 1} follows a new step`);
    assert.ok(!st.ladder && st.name.startsWith("Mix: "), `${t.id}:${i + 1}`);
  }
  const mixRefs = new Set(mixes.map(({ t, i }) => `${t.id}:${i + 1}`));
  for (const t of PATH) for (const st of t.steps) for (const a of st.after ?? []) assert.ok(!mixRefs.has(a), a);
});

test("double stops: a new guitar track in the CAGED topic, right before triads", () => {
  const i = PATH.findIndex((t) => t.id === "double-stops");
  assert.equal(PATH[i + 1].id, "triads");
  const t = PATH[i];
  assert.deepEqual([t.area, t.topic, t.merges, t.steps.map((x) => x.level)], ["guitar", "guitar-caged", [], ["beginner", "beginner", "beginner", "beginner", "intermediate"]]);
});

test("levelOfSteps: the highest level of the steps, unknown refs skipped", () => {
  const top = PATH.find((t) => t.steps.length > 1 && t.steps[0].level !== t.steps[t.steps.length - 1].level)!;
  const last = `${top.id}:${top.steps.length}`;
  assert.equal(levelOfSteps([last, `${top.id}:1`, "nope:1"]), top.steps[top.steps.length - 1].level);
  assert.equal(levelOfSteps([`${top.id}:1`]), top.steps[0].level);
  assert.equal(levelOfSteps(["nope:1"]), undefined);
});
