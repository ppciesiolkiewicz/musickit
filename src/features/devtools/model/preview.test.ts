import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlanConfig } from "@/features/plan/model/config";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { parsePreview, planToCopy, previewPlanText, whyOf } from "./preview";

const ex = { title: "Play", minutes: 5, sections: [{ type: "text", text: "Play it" }] };
const plan = (n: number) => ({ title: "P", days: Array.from({ length: n }, (_, i) => ({ theme: `d${i}`, exercises: [ex] })) });

test("an exercise becomes a week of itself", () => {
  const p = JSON.parse(previewPlanText(JSON.stringify(ex)));
  assert.equal(p.title, "Play");
  assert.equal(p.days.length, 7);
  assert.deepEqual(p.days[6].exercises, [ex]);
});

test("a short plan is padded by repeating its days in order", () => {
  const p = JSON.parse(previewPlanText(JSON.stringify(plan(2))));
  assert.deepEqual(p.days.map((d: { theme: string }) => d.theme), ["d0", "d1", "d0", "d1", "d0", "d1", "d0"]);
});

test("a full plan and anything else pass through", () => {
  const full = JSON.stringify(plan(7));
  assert.equal(previewPlanText(full), full);
  assert.equal(previewPlanText("[1,2]"), "[1,2]");
  assert.equal(previewPlanText("{ broken"), "{ broken");
});

test("parsePreview: an exercise gives that one exercise, a plan its week", () => {
  const one = parsePreview(JSON.stringify(EXERCISE_EXAMPLES[0].exercise), []);
  assert.ok(one.ok && one.exercise && !one.config);
  const week = parsePreview(JSON.stringify(PLAN_EXAMPLES[0].plan), []);
  assert.ok(week.ok && week.config?.days.length === 7 && !week.exercise);
  assert.equal(parsePreview("nope", []).ok, false);
});

test("every library example previews", () => {
  for (const e of EXERCISE_EXAMPLES) assert.ok(parsePlanConfig(previewPlanText(JSON.stringify(e.exercise)), []).ok, e.id);
  for (const p of PLAN_EXAMPLES) assert.ok(parsePlanConfig(previewPlanText(JSON.stringify(p.plan)), []).ok, p.id);
});

test("whyOf reads an example part's note", () => {
  assert.equal(whyOf("### Example: x\nWhy it's good: Short and clear.\n```json\n{}\n```"), "Short and clear.");
  assert.equal(whyOf("```json\n{}\n```"), undefined);
});

test("planToCopy: any example becomes a plan /plan accepts", () => {
  const ex = EXERCISE_EXAMPLES[0];
  const text = planToCopy(JSON.stringify(ex.exercise), ex.note);
  const r = parsePlanConfig(text, []);
  assert.ok(r.ok);
  assert.equal(r.config.days.length, 7);
  assert.equal(r.config.days[3].theme, (ex.exercise as { title: string }).title);
  assert.equal(r.config.summary, ex.note);
  assert.ok(parsePlanConfig(planToCopy(JSON.stringify(PLAN_EXAMPLES[0].plan)), []).ok);
});
