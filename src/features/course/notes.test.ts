import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasNotes, marksText, parseNotesStore } from "./notes";

const parse = (v: unknown) => parseNotesStore(JSON.stringify(v));

describe("notes store parsing", () => {
  it("missing or broken storage gives no notes", () => {
    assert.deepEqual(parseNotesStore(null), {});
    assert.deepEqual(parseNotesStore("{oops"), {});
    assert.deepEqual(parseNotesStore("[1,2]"), {});
  });
  it("keeps stars, date and note", () => {
    const n = { stars: 3, at: "2026-11-10T00:00:00.000Z", note: "hi" };
    assert.deepEqual(parse({ "1/a": n }), { "1/a": n });
  });
  it("old know labels become stars and the other labels go", () => {
    assert.deepEqual(parse({ "1/a": { know: "solid", like: 4, tags: ["x"], note: "" } }), { "1/a": { stars: 4, note: "" } });
    assert.equal(parse({ "1/a": { know: "new", note: "" } })["1/a"].stars, 1);
    assert.equal(parse({ "1/a": { know: "getting", note: "" } })["1/a"].stars, 2);
    assert.equal(parse({ "1/a": { know: "own", note: "" } })["1/a"].stars, 5);
  });
  it("stars win over an old know label", () => {
    assert.equal(parse({ "1/a": { stars: 3, know: "own", note: "" } })["1/a"].stars, 3);
  });
  it("a section left with only dropped labels is dropped", () => {
    assert.deepEqual(parse({ "1/a": { like: 2, tags: ["clicked"], often: true, note: "  " } }), {});
    assert.deepEqual(parse({ "1/a": { know: "bogus", stars: 9, note: "" } }), {});
  });
});

describe("marks", () => {
  it("one star sign per star, then a note sign", () => {
    assert.equal(marksText({ stars: 2, note: "x" }), "★★ 📝");
    assert.equal(marksText({ stars: 5, note: "" }), "★★★★★");
    assert.equal(marksText({ note: "x" }), "📝");
    assert.equal(marksText({ note: "" }), "");
  });
  it("hasNotes is stars or a note", () => {
    assert.equal(hasNotes({ note: " " }), false);
    assert.equal(hasNotes({ stars: 1, note: "" }), true);
    assert.equal(hasNotes({ note: "x" }), true);
  });
});
