import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { commentsMarkdown, exampleHashes, hashKey, placeOf, quoteOf, readComments, repinComments, sectionHash, sectionText, stateOf, type SectionComment } from "./comments";

const c = (over: Partial<SectionComment> = {}): SectionComment => ({
  id: "1", example: "ex-a", address: "ex", index: 2, kind: "text", quote: "Play box 1", hash: sectionHash({ type: "text", text: "Play box 1" }),
  commit: "abc1234", text: "Too long", at: "2026-11-01T10:00:00.000Z", ...over,
});

test("sectionHash: stable, and differs when the section does", () => {
  assert.equal(sectionHash({ type: "text", text: "a" }), sectionHash({ type: "text", text: "a" }));
  assert.notEqual(sectionHash({ type: "text", text: "a" }), sectionHash({ type: "text", text: "b" }));
  assert.match(sectionHash({}), /^[0-9a-f]{8}$/);
});

test("sectionText and quoteOf", () => {
  assert.equal(sectionText({ type: "list", items: ["a", "b"] }), "a / b");
  assert.equal(sectionText({ type: "tool", tool: { type: "staff" } }), "tool: staff");
  assert.equal(quoteOf("x".repeat(200), 10).length, 10);
});

test("placeOf names a plan's day and exercise", () => {
  assert.equal(placeOf({ address: "ex", index: 0 }), "section 1");
  assert.equal(placeOf({ address: "d2.e0", index: 3 }), "day 3, exercise 1, section 4");
});

test("stateOf: current, changed, gone", () => {
  const x = c();
  assert.equal(stateOf(x, x.hash), "current");
  assert.equal(stateOf(x, "00000000"), "changed");
  assert.equal(stateOf(x, undefined), "gone");
});

test("readComments drops what isn't a comment", () => {
  assert.deepEqual(readComments(null), []);
  assert.deepEqual(readComments([c(), { id: 1 }, null]), [c()]);
});

test("commentsMarkdown groups by example and flags changed sections", () => {
  const a = c(), b = c({ id: "2", index: 0, text: "Line 1\nLine 2" }), other = c({ id: "3", example: "ex-b" });
  const md = commentsMarkdown([a, b, other], {
    files: { "ex-a": { path: "x/ex-a.json" } },
    hashes: { [hashKey("ex-a", "ex", 2)]: "changed!", [hashKey("ex-a", "ex", 0)]: b.hash },
  });
  assert.match(md, /## ex-a \(x\/ex-a\.json\)\n/);
  assert.doesNotMatch(md, /commented at|@/);
  assert.ok(md.indexOf("section 1") < md.indexOf("section 3"), "in section order");
  assert.match(md, /section 3[^\n]*\n {2}> Play box 1\n {2}⚠ The section has changed/);
  assert.match(md, /## ex-b/);
  assert.match(md, /## ex-b[\s\S]*⚠ This section no longer exists/);
  assert.match(md, / {2}Line 1\n {2}Line 2/);
});

test("exampleHashes: every section of exercise and plan examples", () => {
  const ex = EXERCISE_EXAMPLES[0], plan = PLAN_EXAMPLES[0];
  const h = exampleHashes([{ id: ex.id, json: JSON.stringify(ex.exercise) }, { id: plan.id, json: JSON.stringify(plan.plan) }], []);
  assert.ok(h[hashKey(ex.id, "ex", 0)]);
  assert.ok(h[hashKey(plan.id, "d6.e0", 0)]);
  assert.equal(h[hashKey(ex.id, "ex", 999)], undefined);
});

test("repinComments: pins each comment to its section now and the file's commit; gone ones stay", () => {
  const now = { type: "text", text: "Play box 1 and 2" } as const;
  const sections = { [hashKey("ex-a", "ex", 2)]: now };
  const [kept, gone] = repinComments([c({ dirty: true }), c({ id: "2", index: 5 })], sections, { "ex-a": { commit: "def5678" } });
  assert.equal(kept.hash, sectionHash(now));
  assert.equal(kept.quote, "Play box 1 and 2");
  assert.equal(kept.commit, "def5678");
  assert.equal(kept.dirty, undefined);
  assert.equal(stateOf(kept, sectionHash(now)), "current");
  assert.deepEqual(gone, c({ id: "2", index: 5 }));
  assert.equal(repinComments([c()], sections)[0].commit, "abc1234");
});
