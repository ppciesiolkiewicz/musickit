import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { exampleHashes, hashKey, quoteOf, repinSectionNotes, sectionHash, sectionText } from "./comments";
import { stateOf, type CopyNote, type NoteSection } from "./copyNotes";

const c = (over: Partial<CopyNote> = {}, at: Partial<NoteSection> = {}): CopyNote => ({
  id: "1", route: "/dev/examples", text: "Play box 1", where: "ex-a · section 3", note: "Too long", at: "2026-11-01T10:00:00.000Z",
  section: { example: "ex-a", address: "ex", index: 2, kind: "text", hash: sectionHash({ type: "text", text: "Play box 1" }), commit: "abc1234", ...at }, ...over,
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

test("exampleHashes: every section of exercise and plan examples", () => {
  const ex = EXERCISE_EXAMPLES[0], plan = PLAN_EXAMPLES[0];
  const h = exampleHashes([{ id: ex.id, json: JSON.stringify(ex.exercise) }, { id: plan.id, json: JSON.stringify(plan.plan) }], []);
  assert.ok(h[hashKey(ex.id, "ex", 0)]);
  assert.ok(h[hashKey(plan.id, "d6.e0", 0)]);
  assert.equal(h[hashKey(ex.id, "ex", 999)], undefined);
});

test("repinSectionNotes: pins each section note to its section now and the file's commit; gone and text notes stay", () => {
  const now = { type: "text", text: "Play box 1 and 2" } as const;
  const sections = { [hashKey("ex-a", "ex", 2)]: now };
  const plain: CopyNote = { id: "3", route: "/plan", text: "x", where: "p", note: "n", at: "t" };
  const [kept, gone, other] = repinSectionNotes([c({}, { dirty: true }), c({ id: "2" }, { index: 5 }), plain], sections, { "ex-a": { commit: "def5678" } });
  assert.equal(kept.section?.hash, sectionHash(now));
  assert.equal(kept.text, "Play box 1 and 2");
  assert.equal(kept.section?.commit, "def5678");
  assert.equal(kept.section?.dirty, undefined);
  assert.equal(stateOf(kept.section!, sectionHash(now)), "current");
  assert.deepEqual(gone, c({ id: "2" }, { index: 5 }));
  assert.equal(other, plain);
  assert.equal(repinSectionNotes([c()], sections)[0].section?.commit, "abc1234");
});
