import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { draftOf, draftWarnings, editDay, exerciseFromDraft, metaOf, sameExercise, type DayDraft } from "./editPlan";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (id: string, minutes = 5): PlanExercise => ({ id, title: `Ex ${id}`, minutes, cells: [{ type: "text", text: id, id: `c-${id}` }] });
const plan = (): StoredPlan => ({
  id: "p", startedOn: "2026-11-13",
  config: { title: "W", days: [{ theme: "A", exercises: [ex("x"), ex("y")] }, { theme: "B", exercises: [ex("a"), ex("b"), ex("c"), ex("d")] }] } as never,
  done: { "1:0": true, "1:1": true, "1:2": true, "0:0": true },
  rated: { "1:1": { stars: 4, at: "t" }, "1:2": { stars: 2, at: "t" }, "0:0": { stars: 5, at: "t" } },
  spent: { "1:2": 60, "1:3": 30 },
  elapsed: { "1": 300 },
} as never);
let n = 0;
const id = () => `new${n++}`;
const keys = (r: Record<string, unknown> | undefined) => Object.keys(r ?? {}).sort();

describe("editDay", () => {
  it("an untouched draft gives back the same plan", () => {
    const p = plan();
    assert.equal(editDay(p, 1, draftOf(p, 1), id), p);
  });
  it("an edited exercise is a new one: new id, its stars, tick and time cleared; the rest kept", () => {
    const p = plan();
    const d = draftOf(p, 1);
    d.exercises[2] = { ...d.exercises[2], exercise: { ...d.exercises[2].exercise, minutes: 9 } };
    const out = editDay(p, 1, d, id) as StoredPlan;
    const e = out.config.days[1].exercises;
    assert.deepEqual(e.map((x) => x.id), ["a", "b", "new0", "d"].map((s) => (s === "new0" ? e[2].id : s)));
    assert.notEqual(e[2].id, "c");
    assert.deepEqual(keys(out.rated), ["0:0", "1:1"]);
    assert.deepEqual(keys(out.done), ["0:0", "1:0", "1:1"]);
    assert.deepEqual(keys(out.spent), ["1:3"]);
    assert.deepEqual(out.elapsed, { "1": 300 });
  });
  it("removing an exercise moves the ratings after it", () => {
    const p = plan();
    const d = draftOf(p, 1);
    d.exercises.splice(1, 1);
    const out = editDay(p, 1, d, id) as StoredPlan;
    assert.deepEqual(out.config.days[1].exercises.map((x) => x.id), ["a", "c", "d"]);
    assert.deepEqual(out.rated?.["1:1"], { stars: 2, at: "t" });
    assert.equal(out.rated?.["1:2"], undefined);
    assert.deepEqual(keys(out.spent), ["1:1", "1:2"]);
  });
  it("an insert shifts the keys after it; the new exercise has a fresh id and no state", () => {
    const p = plan();
    const d: DayDraft = draftOf(p, 1);
    d.exercises.splice(1, 0, { from: null, exercise: { title: "New", minutes: 10, cells: [] } });
    const out = editDay(p, 1, d, id) as StoredPlan;
    const e = out.config.days[1].exercises;
    assert.equal(e.length, 5);
    assert.ok(e[1].id && e[1].id.startsWith("new"));
    assert.deepEqual(out.rated?.["1:2"], { stars: 4, at: "t" });
    assert.equal(out.done["1:1"], undefined);
  });
  it("a reorder keeps every exercise's own state", () => {
    const p = plan();
    const d = draftOf(p, 1);
    [d.exercises[1], d.exercises[2]] = [d.exercises[2], d.exercises[1]];
    const out = editDay(p, 1, d, id) as StoredPlan;
    assert.deepEqual(out.config.days[1].exercises.map((x) => x.id), ["a", "c", "b", "d"]);
    assert.deepEqual(out.rated?.["1:1"], { stars: 2, at: "t" });
    assert.deepEqual(out.rated?.["1:2"], { stars: 4, at: "t" });
  });
  it("refuses fewer than 2 or more than 5 exercises", () => {
    const p = plan();
    assert.ok("refused" in editDay(p, 0, { exercises: draftOf(p, 0).exercises.slice(0, 1) }, id));
    const six = draftOf(p, 1);
    six.exercises.push({ from: null, exercise: ex("e") }, { from: null, exercise: ex("f") });
    assert.ok("refused" in editDay(p, 1, six, id));
  });
  it("other days are untouched", () => {
    const p = plan();
    const d = draftOf(p, 1);
    d.exercises.splice(0, 1);
    const out = editDay(p, 1, d, id) as StoredPlan;
    assert.equal(out.config.days[0], p.config.days[0]);
    assert.deepEqual(out.rated?.["0:0"], { stars: 5, at: "t" });
  });
});

describe("sameExercise", () => {
  it("ignores cell ids", () => {
    const a = ex("x");
    assert.ok(sameExercise(a, { ...a, cells: [{ type: "text", text: "x", id: "other" }] }));
    assert.ok(!sameExercise(a, { ...a, minutes: 6 }));
  });
});

describe("an exercise from the day editor", () => {
  const old: PlanExercise = { id: "o", title: "Old", minutes: 5, area: "guitar", level: "beginner", tags: ["technique"], topic: "x" as never, learnBefore: ["/a"], cells: [{ type: "text", text: "Hi" }] };
  it("reads the title's hashtags into its fields and keeps what the form doesn't show", () => {
    const e = exerciseFromDraft(old, { titleText: "New one #voice #advanced", minutes: 8, why: "Because", learnBefore: ["/b"], exploreMore: [] }, { cells: old.cells });
    assert.equal(e.title, "New one");
    assert.equal(e.area, "voice");
    assert.equal(e.level, "advanced");
    assert.equal(e.minutes, 8);
    assert.equal(e.why, "Because");
    assert.deepEqual(e.learnBefore, ["/b"]);
    assert.equal(e.exploreMore, undefined);
    assert.equal(e.topic, "x");
  });
  it("metaOf writes the title back with its hashtags", () => {
    assert.equal(metaOf(old).titleText, "Old #guitar #beginner #technique");
  });
  it("warns as a paste would, without re-reading the tools", () => {
    const w = draftWarnings({ title: "T", minutes: 5, cells: [{ type: "text", text: "x" }] });
    assert.ok(w.some((s) => /learnBefore|Learn before/.test(s)));
    assert.ok(w.some((s) => /no .*level/.test(s)));
    assert.deepEqual(draftWarnings({ ...old, title: "Old" }), []);
  });
});
