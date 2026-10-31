import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "./catalogue";
import { buildPrompt, promptParts } from "./prompt";
import { DEFAULT_ANSWERS } from "./questions";
import { conceptsFor } from "./concepts";
import { selectExamples } from "./exampleSelection";
import type { PlanAnswers, StoredPlan } from "./types";

const last: StoredPlan = {
  id: "p", startedOn: "2026-10-24", done: { "0:0": true },
  config: { title: "Week 1", days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ title: `Ex ${i}`, minutes: 5, sections: [{ type: "text" as const, text: "x" }] }] })) },
};
const EX = selectExamples(DEFAULT_ANSWERS);
const EXAMPLE_IDS = [...EX.exercises.map((e) => `example:${e.id}`), `example:${EX.plan.id}`];
const ORDER = ["intro", "student", "how-to-plan", "rules", "mistakes", "exercise-format", "sections", "tools", "links", ...EXAMPLE_IDS.slice(0, -1), "answer-format", EXAMPLE_IDS.at(-1)!];

test("prompt parts have unique ids in the documented order", () => {
  assert.deepEqual(promptParts(DEFAULT_ANSWERS, []).map((p) => p.id), ORDER);
  const next = promptParts(DEFAULT_ANSWERS, [], [last]).map((p) => p.id);
  assert.deepEqual(next, [...ORDER.slice(0, 2), "history", ...ORDER.slice(2)]);
  assert.equal(new Set(next).size, next.length);
});

test("buildPrompt is the join of its parts", () => {
  const e = catalogue();
  const joined = (a: Parameters<typeof promptParts>) => promptParts(...a).map((p) => p.text).join("\n");
  const cases: Parameters<typeof promptParts>[] = [[DEFAULT_ANSWERS, e], [null, []], [DEFAULT_ANSWERS, e, [last]]];
  for (const a of cases) assert.equal(buildPrompt(...a), joined(a));
});

test("every part has a label and text", () => {
  for (const p of promptParts(DEFAULT_ANSWERS, catalogue(), [last])) assert.ok(p.label && p.text.trim(), p.id);
});

test("example parts carry parseable JSON, the library examples first and the plan last", () => {
  const ex = promptParts(DEFAULT_ANSWERS, []).filter((p) => p.kind === "example");
  assert.deepEqual(ex.map((p) => p.example?.id), [...EX.exercises.map((e) => e.id), EX.plan.id]);
  for (const p of ex) {
    assert.ok(JSON.parse(p.example!.json));
    assert.ok(p.text.includes(p.example!.json));
    assert.match(p.text, new RegExp(`### Example: ${p.example!.id}\\nWhy it's good: `));
  }
  assert.ok(JSON.parse(ex.at(-1)!.example!.json).days.length === 7);
});

const rated: PlanAnswers = {
  levels: { guitar: "intermediate", theory: "beginner", voice: "beginner" },
  ratings: { "major-scale": 2, pentatonic: 4 },
  voice: { type: "tenor", range: { low: 48, high: 72 } },
  focus: ["major-scale"], minutes: 20, styles: "blues", notes: "I rush",
};
const student = (a: PlanAnswers) => promptParts(a, []).find((p) => p.id === "student")!.text;

test("student part: levels, stars, unsure, voice, focus, minutes, styles as flavour", () => {
  const t = student(rated);
  assert.match(t, /Major scale ★★☆☆☆/);
  assert.match(t, /Pentatonic \(minor & major\) ★★★★☆/);
  const unrated = conceptsFor("guitar", "intermediate")[0];
  assert.ok(t.includes(`${unrated.label} (unsure)`));
  assert.match(t, /Tenor/);
  assert.match(t, /C3/);
  assert.match(t, /C5/);
  assert.match(t, /Focus this week: Major scale/);
  assert.match(t, /about 20 minutes/);
  assert.match(t, /blues \(flavour only/);
  assert.match(t, /I rush/);
});

test("the prompt drops repeats arithmetic and the old singing rule, and teaches blocks", () => {
  const all = buildPrompt(rated, catalogue());
  assert.doesNotMatch(all, /repeats x/);
  assert.doesNotMatch(all, /Always pair singing with playing/);
  assert.match(all, /at most one block of 3 minutes or less/);
  assert.match(all, /"minutes": 3/);
  assert.match(all, /Why it's good:/);
});

test("skipped questionnaire: the student part asks for the answers", () => {
  assert.match(promptParts(null, []).find((p) => p.id === "student")!.text, /skipped the questionnaire/);
});
