import { test } from "node:test";
import assert from "node:assert/strict";
import { CRITERIA, assessJobs, assessPrompt, isCurrent, parseVerdict, type Assessment } from "./assess";
import { cellKey } from "./compare";
import type { RunSummary } from "./history";

const run = (o: Partial<RunSummary>): RunSummary => ({ id: "x", at: "2026-11-15T10:00:00Z", mode: "first", model: "claude-haiku-5-5", ok: true, durationMs: 1, chars: 1, edited: [], persona: "p", title: "Week 1", ...o });

test("assessPrompt carries the prompt, both plans and the parser's warnings, and names every criterion", () => {
  const text = assessPrompt({ prompt: "THE PROMPT", reference: { reply: "REF PLAN", warnings: [] }, candidate: { reply: "CAND PLAN", warnings: ["day 2: unknown tool"] } });
  for (const part of ["THE PROMPT", "REF PLAN", "CAND PLAN", "- day 2: unknown tool", "none"]) assert.ok(text.includes(part), part);
  for (const c of CRITERIA) assert.ok(text.includes(`"${c.id}"`), c.id);
  assert.ok(!/fable|opus|sonnet|haiku/i.test(text), "the judge is not told which model wrote which plan");
});

test("parseVerdict reads the JSON out of a fenced reply and keeps scores in range", () => {
  const r = parseVerdict('Here it is:\n```json\n{"score": 12, "summary": " ok ", "criteria": [{"id": "fit", "score": 4.4, "note": "n"}, {"id": "nope", "score": 3}, {"id": "music", "score": 0}], "stronger": ["a", "", 3], "weaker": [], "mistakes": ["Day 1, exercise 2: wrong key"]}\n```');
  assert.ok(r.ok);
  assert.equal(r.verdict.score, 10);
  assert.equal(r.verdict.summary, "ok");
  assert.deepEqual(r.verdict.criteria, [{ id: "fit", score: 4, note: "n" }, { id: "music", score: 1, note: "" }]);
  assert.deepEqual(r.verdict.stronger, ["a"]);
  assert.deepEqual(r.verdict.mistakes, ["Day 1, exercise 2: wrong key"]);
});

test("parseVerdict says why a reply can't be read", () => {
  assert.deepEqual(parseVerdict("I can't do that."), { ok: false, error: "No JSON object in the reply." });
  assert.equal(parseVerdict('{"summary": "no score"}').ok, false);
  assert.equal(parseVerdict("{ broken }").ok, false);
});

test("assessJobs: the judge model's plan is the reference, every other plan for the player a candidate", () => {
  const cells = new Map([
    run({ id: "ref", model: "claude-fable-5-2" }),
    run({ id: "a", model: "claude-haiku-5-5" }),
    run({ id: "b", model: "claude-opus-5-5" }),
    run({ id: "not-a-plan", model: "claude-sonnet-5-5", title: undefined }),
    run({ id: "other", model: "claude-opus-5-5", persona: "q" }),
  ].map((r) => [cellKey(r.persona!, r.model as "claude-haiku-5-5"), r]));
  const jobs = assessJobs("p", cells);
  assert.equal(jobs?.reference.id, "ref");
  assert.deepEqual(jobs?.candidates.map((r) => r.id), ["a", "b"]);
  assert.equal(assessJobs("q", cells), null);
});

test("isCurrent: only a read verdict against today's reference", () => {
  const a: Assessment = { candidateId: "a", referenceId: "ref", persona: "p", at: "", judge: "claude-fable-5-2", durationMs: 1, verdict: { score: 7, summary: "", criteria: [], stronger: [], weaker: [], mistakes: [] } };
  assert.equal(isCurrent(a, "ref"), true);
  assert.equal(isCurrent(a, "newer"), false);
  assert.equal(isCurrent({ ...a, verdict: undefined, error: "x" }, "ref"), false);
  assert.equal(isCurrent(undefined, "ref"), false);
});
