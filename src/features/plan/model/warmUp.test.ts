import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BLOCKS } from "@/features/library/seed";
import { blockKeyOf } from "./blockId";
import { catalogue } from "./catalogue";
import { cleanExercise } from "./cleanExercise";
import { parseExercise } from "./config";
import type { Level, PlanExercise, WarmUpPart } from "./types";
import { warmUpCap, warmUpRun, type WarmUpChoice } from "./warmUp";

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
