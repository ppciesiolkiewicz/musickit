import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BLOCKS } from "@/features/library/seed";
import { blockKeyOf } from "./blockId";
import { catalogue } from "./catalogue";
import { cleanExercise } from "./cleanExercise";
import { parseExercise } from "./config";
import type { Level, PlanExercise, WarmUpPart } from "./types";
import { keyFitsRange, warmUpCap, warmUpKeyPool, warmUpKeys, warmUpRun, type WarmUpChoice } from "./warmUp";

const warm = (id: string, part: WarmUpPart, minutes = 2, level: Level = "new", area = "voice"): WarmUpChoice => {
  const exercise = { title: id, cells: [], minutes, kind: "warm-up", warmUpPart: part, area, level, blockId: id, choiceId: `${id}/c` } as PlanExercise;
  return { blockId: id, choiceId: `${id}/c`, minutes, exercise };
};
const pool = [warm("b1", 1), warm("b2", 1), warm("l1", 2, 1), warm("l2", 2, 1), warm("l3", 2, 1), warm("s1", 3), warm("s2", 3)];
const run = (over: Partial<Parameters<typeof warmUpRun>[0]> = {}) => warmUpRun({ area: "voice", level: "beginner", cap: 5, day: 0, blocks: pool, ...over });
const ids = (r: { picks: WarmUpChoice[] }) => r.picks.map((c) => c.blockId);

test("warmUpCap: a third of the section, at most 8", () => {
  assert.deepEqual([9, 15, 20, 24, 60].map(warmUpCap), [3, 5, 6, 8, 8]);
});

test("warmUpRun: one block of each part, in the order of the parts, inside the cap", () => {
  const r = run();
  assert.deepEqual(ids(r), ["b1", "l1", "s1"]);
  assert.equal(r.minutes, 5);
  assert.equal(r.pool, 7);
});

test("warmUpRun: the run turns with the day", () => {
  assert.deepEqual(ids(run({ day: 1 })), ["b2", "l2", "s2"]);
  assert.deepEqual(ids(run({ day: 2 })), ["b1", "l3", "s1"]);
});

test("warmUpRun: with more room it goes round the parts again, and stays in part order", () => {
  const r = run({ cap: 8 });
  assert.deepEqual(ids(r), ["b1", "b2", "l1", "l2", "s1"]);
  assert.equal(r.minutes, 8);
});

test("warmUpRun: a block that does not fit is passed over, and no cap gives no run", () => {
  assert.deepEqual(ids(run({ cap: 3 })), ["b1", "l1"]);
  assert.deepEqual(ids(run({ cap: 0 })), []);
});

test("warmUpRun: only warm-ups of the area, at or under the player's level, and not barred", () => {
  const blocks = [...pool, warm("hard", 1, 2, "advanced"), warm("g1", 1, 2, "new", "guitar"), { ...warm("plain", 1), exercise: { title: "plain", cells: [], minutes: 2, area: "voice" } as PlanExercise }];
  assert.equal(run({ blocks }).pool, 7);
  assert.equal(run({ blocks, level: "advanced" }).pool, 8);
  assert.deepEqual(ids(run({ blocks, area: "guitar" })), ["g1"]);
  assert.deepEqual(ids(run({ barred: new Set(["b1"]) })), ["b2", "l1", "s1"]);
});

test("warmUpRun: one choice a block, the highest at or under the player's level", () => {
  const two = [{ ...warm("b", 1, 2, "new"), choiceId: "b/new" }, { ...warm("b", 1, 3, "intermediate"), choiceId: "b/intermediate" }];
  assert.deepEqual(run({ blocks: two, level: "beginner" }).picks.map((c) => c.choiceId), ["b/new"]);
  assert.deepEqual(run({ blocks: two, level: "advanced" }).picks.map((c) => c.choiceId), ["b/intermediate"]);
});

test("warmUpRun: a pick's turn is how many times its part has gone round its blocks", () => {
  // part 1 has two blocks, part 2 three, part 3 two
  const turnsOn = (day: number) => { const r = run({ day }); return r.picks.map((c) => [c.blockId, r.turns.get(c.choiceId)]); };
  assert.deepEqual(turnsOn(0), [["b1", 0], ["l1", 0], ["s1", 0]]);
  assert.deepEqual(turnsOn(1), [["b2", 0], ["l2", 0], ["s2", 0]]);
  assert.deepEqual(turnsOn(2), [["b1", 1], ["l3", 0], ["s1", 1]]);
  assert.deepEqual(turnsOn(7), [["b2", 3], ["l2", 2], ["s2", 3]]);
});

test("warmUpKeyPool: the day's keys, then their neighbours on the circle of fifths; the player's keys when the day has none", () => {
  const pool = (over: Partial<Parameters<typeof warmUpKeyPool>[0]> = {}) => warmUpKeyPool({ area: "voice", rung: 0, ...over });
  // exercises in G and C: those two first, then D (a fifth above G) and F (a fifth below C)
  assert.deepEqual(pool({ dayKeys: [7, 0, 7] }), [7, 0, 2, 5]);
  assert.deepEqual(pool({ dayKeys: [9] }), [9, 4, 2]);
  // no key in the day: the voice ladder up to the player's rung (C; then E), and the neighbours
  assert.deepEqual(pool(), [0, 7, 5]);
  assert.deepEqual(pool({ rung: 1 }), [0, 4, 7, 5, 11, 9]);
  assert.deepEqual(pool({ area: "guitar" }), [9, 4, 2]);
});

test("warmUpKeyPool: with a sung range of the player's own, only keys whose octave from Do fits in it", () => {
  // A2 to C4 (45 to 60): an octave fits from A, B flat, B and C only
  assert.deepEqual([9, 10, 11, 0, 1, 7].map((k) => keyFitsRange(k, { low: 45, high: 60 })), [true, true, true, true, false, false]);
  assert.deepEqual(warmUpKeyPool({ area: "voice", rung: 0, dayKeys: [0], range: { low: 45, high: 60 } }), [0]);
  // two octaves hold every key
  assert.deepEqual(warmUpKeyPool({ area: "voice", rung: 0, dayKeys: [0], range: { low: 48, high: 72 } }), [0, 7, 5]);
  // a range no key fits changes nothing
  assert.deepEqual(warmUpKeyPool({ area: "voice", rung: 0, dayKeys: [0], range: { low: 50, high: 57 } }), [0, 7, 5]);
});

test("warmUpKeys: the next key of the pool each turn, the others to go back to", () => {
  assert.deepEqual([0, 1, 2, 3].map((t) => warmUpKeys([0, 7, 5], t)), [
    { now: [0], back: [7, 5] }, { now: [7], back: [0, 5] }, { now: [5], back: [0, 7] }, { now: [0], back: [7, 5] },
  ]);
  assert.deepEqual(warmUpKeys([0, 4, 7, 5, 11, 9], 4), { now: [11], back: [0, 4, 7] });
  assert.equal(warmUpKeys([], 2), null);
});

// --- the parser and the seed

test("parseExercise: a warm-up keeps its kind and part and names no step", () => {
  const raw = { title: "Loose hands", kind: "warm-up", warmUpPart: 2, steps: ["spider:1"], area: "guitar", level: "new", tags: ["technique"], topic: "guitar-techniques", minutes: 1, cells: [{ type: "text", text: "Shake both hands out." }] };
  const { block, warnings } = parseExercise(raw, "x", catalogue());
  assert.deepEqual([block?.kind, block?.warmUpPart, block?.steps], ["warm-up", 2, undefined]);
  assert.ok(warnings.some((w) => w.includes("a warm-up names no steps")));
  assert.equal(parseExercise({ ...raw, kind: "other" }, "x", catalogue()).block?.kind, undefined);
  assert.equal(blockKeyOf(block!).content.kind, "warm-up");
  assert.equal(cleanExercise({ ...block!, kind: "nope" as never }).kind, undefined);
});

test("the seed's warm-ups: voice and guitar each have every part, each names no step and says its part", () => {
  const warmUps = SEED_BLOCKS.filter((f) => f.exercise.kind === "warm-up");
  for (const f of warmUps) {
    assert.ok([1, 2, 3].includes(f.exercise.warmUpPart as number), f.id);
    assert.ok(f.choices.every((c) => c.steps.length === 0), f.id);
  }
  for (const area of ["voice", "guitar"]) for (const part of [1, 2, 3]) {
    assert.ok(warmUps.some((f) => f.exercise.area === area && f.exercise.warmUpPart === part && f.choices.some((c) => c.level === "new" || c.level === "beginner")), `${area} part ${part}`);
  }
  // a brand new player still gets a run in each area
  for (const area of ["voice", "guitar"]) assert.ok(warmUps.some((f) => f.exercise.area === area && f.choices.some((c) => c.level === "new")), area);
});
