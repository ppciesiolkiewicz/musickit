import { test } from "node:test";
import assert from "node:assert/strict";
import { RUN_ID, describeReply, newRunId, summaryOf, type RunRecord } from "./history";
import type { CatalogueEntry } from "@/features/plan/model/catalogue";

const record = (over: Partial<RunRecord> = {}): RunRecord => ({
  id: "2026-10-31T14-05-09-a1b2", at: "2026-10-31T14:05:09.000Z", mode: "first", model: "haiku",
  answers: null, overrides: {}, parts: [{ id: "intro", label: "Intro", edited: false, off: false }, { id: "rules", label: "Rules", edited: true, off: false }],
  prompt: "hello", reply: "pong", durationMs: 1200, ...over,
});

const week = (days: number) => JSON.stringify({
  title: "Week 1", progress: "Techniques: starting out.",
  days: Array.from({ length: days }, (_, i) => ({ theme: `Day ${i + 1}`, exercises: [1, 2].map((n) => ({ title: `Play ${n}`, minutes: 5, level: "beginner", area: "guitar", tags: ["technique"], topic: "guitar-techniques", cells: [{ type: "text", text: "Play it" }], learnBefore: ["/theory/chords"] })) })),
});
/** the one page the fixture links to, so a clean week has no warnings */
const pages = [{ href: "/theory/chords", label: "Chords", desc: "" }] satisfies CatalogueEntry[];

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
  assert.deepEqual(describeReply(week(7), pages), { title: "Week 1", warnings: 0 });
  assert.deepEqual(describeReply(week(8), pages), { title: "Week 1", warnings: 1 });
});

test("describeReply: a reply that isn't a plan gives nothing", () => {
  assert.deepEqual(describeReply("Sure! Here is your plan.", []), {});
  assert.deepEqual(describeReply(week(0), []), {}, "a plan with no days is not a plan");
  assert.deepEqual(describeReply(undefined, []), {});
});

