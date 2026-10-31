import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, promptParts } from "@/features/plan/model/prompt";
import { DEFAULT_ANSWERS } from "@/features/plan/model/questions";
import { DEFAULT_STUDIO, answersFromText, composePrompt, readStudio, storedPlanFrom } from "./compose";
import type { RunRecord } from "./history";

const parts = promptParts(DEFAULT_ANSWERS, []);
const textOf = (id: string) => parts.find((p) => p.id === id)!.text;

const run = (reply: string): RunRecord => ({
  id: "2026-10-30T09-00-00-aaaa", at: "2026-10-30T09:00:00.000Z", mode: "first", model: "haiku",
  answers: null, overrides: {}, parts: [], prompt: "p", reply, durationMs: 1,
});
const week = JSON.stringify({
  title: "Week 1",
  days: Array.from({ length: 7 }, (_, i) => ({ theme: `Day ${i + 1}`, exercises: [{ title: "Play", minutes: 5, sections: [{ type: "text", text: "Play it" }] }] })),
});

test("no overrides: the prompt as the player gets it", () => {
  const c = composePrompt(parts, {});
  assert.equal(c.text, buildPrompt(DEFAULT_ANSWERS, []));
  assert.deepEqual([c.edited, c.off], [[], []]);
  assert.deepEqual(c.parts.map((p) => p.id), parts.map((p) => p.id));
});

test("a part switched off is left out", () => {
  const c = composePrompt(parts, { mistakes: { off: true } });
  assert.ok(!c.text.includes(textOf("mistakes")));
  assert.deepEqual(c.off, ["mistakes"]);
  assert.equal(c.parts.find((p) => p.id === "mistakes")?.off, true);
});

test("an edited part replaces its text", () => {
  const c = composePrompt(parts, { rules: { text: "## Rules\n- Be brief.\n" } });
  assert.ok(c.text.includes("## Rules\n- Be brief.\n") && !c.text.includes(textOf("rules")));
  assert.deepEqual(c.edited, ["rules"]);
});

test("an override equal to the text, or for a part that is gone, changes nothing", () => {
  const c = composePrompt(parts, { rules: { text: textOf("rules") }, gone: { text: "x", off: true } });
  assert.equal(c.text, buildPrompt(DEFAULT_ANSWERS, []));
  assert.deepEqual([c.edited, c.off], [[], []]);
});

test("answersFromText: broken JSON, null, and a partial object", () => {
  assert.ok(answersFromText("{").error);
  assert.deepEqual(answersFromText("null"), { answers: null });
  const a = answersFromText("{}").answers;
  assert.ok(a && Object.keys(a.levels).length > 0 && a.minutes > 0);
});

test("storedPlanFrom: a past run as last week", () => {
  assert.equal(storedPlanFrom(run("Sure, here you go."), {}, "", []), null);
  const p = storedPlanFrom(run(week), { "0:0": true }, "too easy", []);
  assert.equal(p?.config.days.length, 7);
  assert.deepEqual([p?.done, p?.feedback, p?.startedOn], [{ "0:0": true }, "too easy", "2026-10-30"]);
});

test("readStudio: saved state, with garbage falling back to defaults", () => {
  assert.deepEqual(readStudio(null), DEFAULT_STUDIO);
  assert.deepEqual(readStudio({ mode: "weird", model: "gpt", overrides: [], answersText: 3 }), DEFAULT_STUDIO);
  const s = { ...DEFAULT_STUDIO, mode: "next" as const, model: "opus" as const, overrides: { rules: { off: true } }, previousId: "x", feedback: "ok" };
  assert.deepEqual(readStudio(JSON.parse(JSON.stringify(s))), s);
});
