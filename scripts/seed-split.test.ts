import assert from "node:assert/strict";
import { test } from "node:test";
import { slugOf, splitSeed, type OldPlanFile } from "./seed-split";

const versions = { prompt: 4, agents: 2, teaching: 5 };

/** A small exercise that parses: one text cell, under 5 minutes. */
const ex = (title: string, text = "Play it slowly.", minutes = 4) => ({
  title,
  minutes,
  level: "beginner",
  area: "guitar",
  tags: ["technique"],
  topic: "guitar-techniques",
  concepts: ["picking"],
  steps: ["picking:1"],
  why: "Slow hands learn the way.",
  learnBefore: ["/course/1/holding-the-pick"],
  cells: [{ type: "text", text }],
});

const plan = (id: string, days: Record<string, unknown>[][]): OldPlanFile => ({
  id,
  answers: { areas: ["guitar"], topics: {}, minutes: 20, styles: "", notes: "" } as unknown as OldPlanFile["answers"],
  model: `model-of-${id}`,
  versions,
  note: `the ${id} week`,
  plan: { title: "Week", summary: "s", progress: "p", days: days.map((exercises, i) => ({ theme: `T${i + 1}`, exercises })) },
});

test("slugOf drops params and punctuation and joins words with hyphens", () => {
  assert.equal(slugOf("{{=key}} minor pentatonic, position 1"), "minor-pentatonic-position-1");
  assert.equal(slugOf("A Mixolydian: find the ♭7"), "a-mixolydian-find-the-flat-7");
  assert.equal(slugOf("Leaps you can't see"), "leaps-you-cant-see");
  assert.equal(slugOf("Sing {{3}} over the ii–V–I"), "sing-over-the-ii-v-i");
  assert.equal(slugOf("!!"), "exercise");
  const long = slugOf("one two three four five six seven eight nine ten eleven twelve thirteen");
  assert.ok(long.length <= 60 && !long.endsWith("-") && "one two three four five six seven eight nine ten eleven twelve thirteen".replace(/ /g, "-").startsWith(long), long);
});

test("a block file's level, steps, moves and minutes move into one choice", () => {
  const moves = { key: "any" };
  const { blocks } = splitSeed([{ id: "guitar-a", model: "m", versions, note: "n", showcase: "pick", exercise: { ...ex("A"), moves } }], []);
  assert.equal(blocks.length, 1);
  const b = blocks[0];
  assert.equal(b.showcase, "pick");
  assert.deepEqual(b.choices, [{ name: "beginner", level: "beginner", steps: ["picking:1"], moves, minutes: 4 }]);
  for (const k of ["level", "steps", "moves", "minutes"]) assert.ok(!(k in b.exercise), k);
  assert.equal(b.exercise.title, "A");
});

test("two different exercises with one title get -2", () => {
  const { blocks, plans } = splitSeed([], [plan("guitar-week", [[ex("Spider walk", "One way.")], [ex("Spider walk", "Another way.")]])]);
  assert.deepEqual(blocks.map((b) => b.id), ["guitar-week-spider-walk", "guitar-week-spider-walk-2"]);
  assert.equal(blocks[1].note, "Moved from plans/guitar-week.json, day 2.");
  assert.equal(blocks[1].model, "model-of-guitar-week");
  assert.equal(blocks[1].showcase, undefined);
  const days = plans[0].plan.days as { exercises: unknown[] }[];
  assert.deepEqual(days[1].exercises, [{ block: "guitar-week-spider-walk-2", choice: "beginner" }]);
});

test("the same exercise in two plans becomes one file and two refs", () => {
  const { blocks, plans, report } = splitSeed([], [plan("guitar-one", [[ex("Spider walk")]]), plan("guitar-two", [[ex("Warm up"), ex("Spider walk")]])]);
  assert.deepEqual(blocks.map((b) => b.id), ["guitar-one-spider-walk", "guitar-two-warm-up"]);
  const second = plans[1].plan.days as { exercises: unknown[] }[];
  assert.deepEqual(second[0].exercises[1], { block: "guitar-one-spider-walk", choice: "beginner" });
  assert.ok(report.some((l) => /folded/i.test(l) && l.includes("1")), report.join("\n"));
});

test("a plan exercise identical to a block file becomes a ref to it", () => {
  const { blocks, plans } = splitSeed([{ id: "guitar-spider", model: "m", versions, note: "n", exercise: ex("Spider walk") }], [plan("guitar-week", [[ex("Spider walk")]])]);
  assert.deepEqual(blocks.map((b) => b.id), ["guitar-spider"]);
  const days = plans[0].plan.days as { exercises: unknown[] }[];
  assert.deepEqual(days[0].exercises, [{ block: "guitar-spider", choice: "beginner" }]);
});

test("a ref keeps its own minutes when they differ from the choice's", () => {
  const { plans } = splitSeed([{ id: "guitar-spider", model: "m", versions, note: "n", exercise: ex("Spider walk", "Play it slowly.", 4) }], [plan("guitar-week", [[ex("Spider walk", "Play it slowly.", 3)]])]);
  const days = plans[0].plan.days as { exercises: unknown[] }[];
  assert.deepEqual(days[0].exercises, [{ block: "guitar-spider", choice: "beginner", minutes: 3 }]);
});

test("an exercise without a level gets the choice main", () => {
  const { level: _l, ...noLevel } = ex("A");
  void _l;
  const { blocks } = splitSeed([{ id: "guitar-a", model: "m", versions, note: "n", exercise: noLevel }], []);
  assert.equal(blocks[0].choices[0].name, "main");
  assert.ok(!("level" in blocks[0].choices[0]));
});
