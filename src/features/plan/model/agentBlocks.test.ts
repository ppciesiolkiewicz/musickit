import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "./catalogue";
import { authoringGuide, insertExercise, readExerciseReply, readNoteReply, readPlanReply, removeExercise, writeExercise, writeNote } from "./agentBlocks";
import type { PlanExercise, StoredPlan } from "./types";

const entries = catalogue();
const link = entries[0].href;
const ex = (id: string): PlanExercise => ({ id, title: `Ex ${id}`, minutes: 5, area: "guitar", level: "beginner", tags: ["technique"], learnBefore: [link], cells: [{ type: "text", text: `Play ${id}.` }] });
const plan = (n = [3, 3, 5, 3, 3, 3, 2]): StoredPlan => ({
  id: "p", startedOn: "2026-11-13", done: { "1:2": true }, rated: { "1:2": { stars: 3, at: "t" }, "1:0": { stars: 5, at: "t" } },
  config: { title: "W", days: n.map((k, d) => ({ theme: `T${d}`, exercises: Array.from({ length: k }, (_, i) => ex(`${d}${i}`)) })) } as never,
} as never);
let n = 0;
const id = () => `new${n++}`;
const raw = { title: "Rewritten #guitar #beginner #technique", minutes: 6, learnBefore: [link], cells: [{ type: "text", text: "Do this." }] };

describe("the authoring guide", () => {
  it("has the format, the tools and a note part; not the student, not videos", () => {
    const g = authoringGuide(entries);
    assert.match(g, /Which tool for what/);
    assert.match(g, /A note is one block/);
    assert.doesNotMatch(g, /\bvideo\b/i);
    assert.doesNotMatch(g, /The player skipped the questionnaire/);
  });
});

describe("notes", () => {
  it("reads a note as JSON", () => assert.match(readNoteReply({ title: "T", cells: [{ type: "text", text: "Hi", id: "x" }] }), /"title": "T"/));
  it("writes a note from an object or a string; refuses one with no cells", () => {
    assert.equal(writeNote({ title: "N", cells: [{ type: "text", text: "Words" }] }).block?.title, "N");
    assert.equal(writeNote(JSON.stringify({ title: "N", cells: [{ type: "text", text: "Words" }] })).block?.title, "N");
    const empty = writeNote({ title: "N", cells: [] });
    assert.equal(empty.block, null);
    assert.match(empty.reply, /no cells/);
  });
});

describe("the running plan", () => {
  it("reads the week with each exercise's rating", () => {
    const r = readPlanReply(plan());
    assert.match(r, /Day 2/);
    assert.match(r, /3 stars|★★★/);
    assert.match(readExerciseReply(plan(), { day: 2, exercise: 3 }), /Ex 12/);
  });
  it("write_block: a new id, its stars cleared, the rest kept", () => {
    const r = writeExercise(plan(), { day: 2, exercise: 3 }, raw, entries, id);
    assert.ok(r.plan);
    const e = r.plan!.config.days[1].exercises;
    assert.equal(e[2].title, "Rewritten");
    assert.notEqual(e[2].id, "12");
    assert.equal(r.plan!.rated?.["1:2"], undefined);
    assert.deepEqual(r.plan!.rated?.["1:0"], { stars: 5, at: "t" });
    assert.equal(writeExercise(plan(), { day: 2, exercise: 3 }, JSON.stringify(raw), entries, id).plan?.config.days[1].exercises[2].title, "Rewritten");
  });
  it("refuses an exercise with no cells or no learnBefore", () => {
    assert.equal(writeExercise(plan(), { day: 2, exercise: 1 }, { ...raw, cells: [] }, entries, id).plan, null);
    const { learnBefore: _l, ...noLink } = raw;
    void _l;
    assert.equal(writeExercise(plan(), { day: 2, exercise: 1 }, noLink, entries, id).plan, null);
  });
  it("insert and remove keep a day within 2 to 5", () => {
    assert.equal(removeExercise(plan(), { day: 7, exercise: 1 }, id).plan, null);
    assert.equal(insertExercise(plan(), { day: 3, exercise: 1 }, raw, entries, id).plan, null);
    const ins = insertExercise(plan(), { day: 1, exercise: 4 }, raw, entries, id);
    assert.equal(ins.plan?.config.days[0].exercises.length, 4);
    const rem = removeExercise(plan(), { day: 1, exercise: 1 }, id);
    assert.equal(rem.plan?.config.days[0].exercises.length, 2);
  });
  it("a where out of range is refused with what is valid", () => {
    for (const w of [{ day: 8, exercise: 1 }, { day: 1, exercise: 0 }, "x", null]) {
      const r = writeExercise(plan(), w, raw, entries, id);
      assert.equal(r.plan, null);
      assert.match(r.reply, /day 1 to 7|exercise 1 to/);
    }
  });
});

describe("final: review fixes", () => {
  it("refuses to change a day the player is editing", () => {
    const r = writeExercise(plan(), { day: 2, exercise: 1 }, raw, entries, id, 1);
    assert.equal(r.plan, null);
    assert.match(r.reply, /editing day 2/);
    assert.equal(removeExercise(plan(), { day: 2, exercise: 1 }, id, 1).plan, null);
    assert.ok(writeExercise(plan(), { day: 3, exercise: 1 }, raw, entries, id, 1).plan);
  });
  it("refuses an exercise whose every cell was left out", () => {
    const broken = { ...raw, cells: [{ type: "tool", tool: { type: "nope" } }, { type: "tool", tool: { type: "scale-neck" } }] };
    const r = writeExercise(plan(), { day: 2, exercise: 3 }, broken, entries, id);
    assert.equal(r.plan, null);
    assert.match(r.reply, /left out/);
  });
  it("a note read and written back keeps a recording's ref", () => {
    const block = { title: "N", cells: [{ type: "tool" as const, id: "c1", tool: { type: "video" as const, ref: { source: "recording" as const, id: "rec-1", title: "Take 1" } } }] };
    const read = readNoteReply(block);
    assert.match(read, /"rec-1"/);
    assert.doesNotMatch(read, /"c1"/);
    const back = writeNote(read.slice(read.indexOf("{")));
    assert.deepEqual((back.block?.cells[0] as { tool: unknown }).tool, block.cells[0].tool);
  });
  it("the guide leaves out the whole example week", () => {
    // the week example was ~30k characters of a ~171k guide; what is left is the tools, rules and exercise examples the AI copies
    assert.ok(authoringGuide(entries).length < 150_000, String(authoringGuide(entries).length));
    assert.doesNotMatch(authoringGuide(entries), /## Example plan/);
  });
  it("a refusal says what the page left out", () => {
    const { learnBefore: _l, ...noLink } = { ...raw, learnBefore: ["/not-a-page"] };
    void _l;
    const r = writeExercise(plan(), { day: 2, exercise: 1 }, { ...noLink, learnBefore: ["/not-a-page"] }, entries, id);
    assert.equal(r.plan, null);
    assert.match(r.reply, /not-a-page|unknown|link/);
  });
});
