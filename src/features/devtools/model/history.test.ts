import { test } from "node:test";
import assert from "node:assert/strict";
import { RUN_ID, describeReply, newRunId, readRunRequest, summaryOf, type RunRecord } from "./history";

const record = (over: Partial<RunRecord> = {}): RunRecord => ({
  id: "2026-10-31T14-05-09-a1b2", at: "2026-10-31T14:05:09.000Z", mode: "first", model: "haiku",
  answers: null, overrides: {}, parts: [{ id: "intro", label: "Intro", edited: false, off: false }, { id: "rules", label: "Rules", edited: true, off: false }],
  prompt: "hello", reply: "pong", durationMs: 1200, ...over,
});

const week = (days: number) => JSON.stringify({
  title: "Week 1",
  days: Array.from({ length: days }, (_, i) => ({ theme: `Day ${i + 1}`, exercises: [{ title: "Play", minutes: 5, sections: [{ type: "text", text: "Play it" }] }] })),
});

test("newRunId sorts by time and matches RUN_ID", () => {
  const id = newRunId(new Date("2026-10-31T14:05:09Z"), "a1b2");
  assert.equal(id, "2026-10-31T14-05-09-a1b2");
  assert.match(id, RUN_ID);
  assert.match(newRunId(new Date()), RUN_ID);
  for (const bad of ["", "../x", "2026-10-31T14-05-09-A1B2", "2026-10-31T14-05-09-a1b2/../../x"]) assert.doesNotMatch(bad, RUN_ID);
});

test("summaryOf: ok, size and edited parts", () => {
  assert.deepEqual(summaryOf(record({ title: "Week 1", warnings: 2, costUsd: 0.01 })), {
    id: "2026-10-31T14-05-09-a1b2", at: "2026-10-31T14:05:09.000Z", mode: "first", model: "haiku",
    ok: true, title: "Week 1", warnings: 2, durationMs: 1200, costUsd: 0.01, chars: 5, edited: ["rules"],
  });
  const failed = summaryOf(record({ error: "cancelled", reply: undefined }));
  assert.deepEqual([failed.ok, failed.error], [false, "cancelled"]);
});

test("describeReply: a plan gives its title and warning count", () => {
  assert.deepEqual(describeReply(week(7), []), { title: "Week 1", warnings: 0 });
  assert.deepEqual(describeReply(week(8), []), { title: "Week 1", warnings: 1 });
});

test("describeReply: a reply that isn't a plan gives nothing", () => {
  assert.deepEqual(describeReply("Sure! Here is your plan.", []), {});
  assert.deepEqual(describeReply(week(3), []), {});
  assert.deepEqual(describeReply(undefined, []), {});
});

test("readRunRequest takes a well-formed body", () => {
  const r = readRunRequest({ prompt: "hi", model: "opus", effort: "high", mode: "next", answers: { minutes: 20 }, overrides: { rules: { off: true } }, parts: [], previousId: "x", feedback: "ok" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.value, { prompt: "hi", model: "opus", effort: "high", mode: "next", answers: { minutes: 20 }, overrides: { rules: { off: true } }, parts: [], previousId: "x", feedback: "ok" });
});

test("readRunRequest fills defaults and rejects what it can't run", () => {
  const r = readRunRequest({ prompt: "hi", model: "haiku" });
  assert.deepEqual(r.ok && r.value, { prompt: "hi", model: "haiku", mode: "first", answers: null, overrides: {}, parts: [] });
  assert.deepEqual(readRunRequest({ prompt: "  ", model: "haiku" }), { ok: false, error: "No prompt." });
  assert.deepEqual(readRunRequest({ prompt: "hi", model: "gpt-4" }), { ok: false, error: "Unknown model." });
  assert.deepEqual(readRunRequest(null), { ok: false, error: "No prompt." });
  const withId = readRunRequest({ prompt: "hi", model: "haiku", id: "2026-11-01T10-00-00-abcd" });
  assert.equal(withId.ok && withId.value.id, "2026-11-01T10-00-00-abcd");
  const badId = readRunRequest({ prompt: "hi", model: "haiku", id: "../../x" });
  assert.ok(badId.ok && !("id" in badId.value));
  const odd = readRunRequest({ prompt: "hi", model: "haiku", effort: "insane", mode: "weird" });
  assert.ok(odd.ok && !("effort" in odd.value) && odd.value.mode === "first");
});
