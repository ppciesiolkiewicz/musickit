import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "./catalogue";
import { buildPrompt, promptParts } from "./prompt";
import { DEFAULT_ANSWERS } from "./questions";
import type { StoredPlan } from "./types";

const last: StoredPlan = {
  id: "p", startedOn: "2026-10-24", done: { "0:0": true },
  config: { title: "Week 1", days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ title: `Ex ${i}`, minutes: 5, sections: [{ type: "text" as const, text: "x" }] }] })) },
};
const ORDER = ["intro", "student", "how-to-plan", "rules", "mistakes", "exercise-format", "sections", "tools", "links", "answer-format", "example:week-1"];

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

test("the example part carries parseable JSON", () => {
  const ex = promptParts(DEFAULT_ANSWERS, []).find((p) => p.kind === "example");
  assert.equal(ex?.example?.id, "week-1");
  assert.ok(JSON.parse(ex!.example!.json).days.length >= 1);
  assert.ok(ex!.text.includes(ex!.example!.json));
});

test("skipped questionnaire: the student part asks for the answers", () => {
  assert.match(promptParts(null, []).find((p) => p.id === "student")!.text, /skipped the questionnaire/);
});
