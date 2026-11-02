import { test } from "node:test";
import assert from "node:assert/strict";
import { clearCopyNotes, copyNotesMarkdown, hashKey, notesOfOldComments, outdatedCount, placeOf, readCopyNotes, repinCopyNotes, squeeze, stateOf, type CopyNote, type NoteSection } from "./copyNotes";

const note = (o: Partial<CopyNote>): CopyNote => ({ id: "1", route: "/plan", text: "Sing with the mic", where: "button", note: "too long", at: "2026-11-02T00:00:00Z", ...o });
const sec = (o: Partial<NoteSection> = {}): NoteSection => ({ example: "ex-a", address: "ex", index: 2, kind: "text", hash: "aaaaaaaa", commit: "abc1234", ...o });
const onSection = (o: Partial<CopyNote> = {}, s: Partial<NoteSection> = {}): CopyNote => note({ route: "/dev/examples", text: "Play box 1", where: "ex-a · section 3", section: sec(s), ...o });

test("keeps only whole notes", () => {
  assert.equal(readCopyNotes([note({}), { id: 1 }, null]).length, 1);
  assert.deepEqual(readCopyNotes("x"), []);
  assert.equal(readCopyNotes([onSection(), note({ section: { example: "x" } as NoteSection })]).length, 1);
});

test("squeezes and cuts text", () => {
  assert.equal(squeeze("  a \n  b "), "a b");
  assert.equal(squeeze("x".repeat(20), 10), "xxxxxxxxx…");
});

test("groups the Markdown by route", () => {
  const md = copyNotesMarkdown([note({}), note({ id: "2", route: "/tuner", text: "Tune" }), note({ id: "3", text: "Play" })]);
  assert.equal(md.match(/^## /gm)?.length, 2);
  assert.ok(md.includes('## /plan\n\n- "Sing with the mic" (button)\n  → too long\n- "Play"'));
});

test("re-pins and clears by page or all", () => {
  const l = [note({}), note({ id: "2", route: "/tuner" })];
  assert.deepEqual(repinCopyNotes(l, "abc").map((n) => n.head), ["abc", "abc"]);
  assert.deepEqual(repinCopyNotes(l, "abc", "/tuner").map((n) => n.head), [undefined, "abc"]);
  assert.deepEqual(clearCopyNotes(l, "/plan").map((n) => n.id), ["2"]);
  assert.deepEqual(clearCopyNotes(l), []);
});

test("names a HEAD other than the current one", () => {
  assert.ok(copyNotesMarkdown([note({ head: "old" })], { head: "new" }).includes("(button, at old)"));
  assert.ok(!copyNotesMarkdown([note({ head: "new" })], { head: "new" }).includes(", at"));
});

test("placeOf names a plan's day and exercise", () => {
  assert.equal(placeOf({ address: "ex", index: 0 }), "section 1");
  assert.equal(placeOf({ address: "d2.e0", index: 3 }), "day 3, exercise 1, section 4");
});

test("stateOf and outdatedCount: current, changed, gone", () => {
  assert.equal(stateOf(sec(), "aaaaaaaa"), "current");
  assert.equal(stateOf(sec(), "00000000"), "changed");
  assert.equal(stateOf(sec(), undefined), "gone");
  const hashes = { [hashKey("ex-a", "ex", 2)]: "aaaaaaaa", [hashKey("ex-a", "ex", 0)]: "changed!" };
  assert.equal(outdatedCount([note({}), onSection(), onSection({ id: "2" }, { index: 0 }), onSection({ id: "3" }, { index: 9 })], hashes), 2);
});

test("section notes in the Markdown: after text notes, in section order, with file, place and a warning when outdated", () => {
  const md = copyNotesMarkdown([onSection({ id: "a" }), note({ route: "/dev/examples", text: "Copy as plan" }), onSection({ id: "b", note: "Line 1\nLine 2" }, { index: 0 })], {
    files: { "ex-a": { path: "x/ex-a.json" } },
    hashes: { [hashKey("ex-a", "ex", 2)]: "changed!", [hashKey("ex-a", "ex", 0)]: "aaaaaaaa" },
  });
  assert.ok(md.indexOf("Copy as plan") < md.indexOf("section 1") && md.indexOf("section 1") < md.indexOf("section 3"));
  assert.match(md, /"Play box 1" \(ex-a x\/ex-a\.json, section 3, text\)\n {2}⚠ The section has changed/);
  assert.match(md, /→ Line 1\n {4}Line 2/);
  assert.match(copyNotesMarkdown([onSection()], { hashes: {} }), /⚠ This section no longer exists/);
});

test("old /dev/examples comments become section notes", () => {
  const [n] = notesOfOldComments([
    { id: "c1", example: "ex-a", address: "d2.e0", index: 3, kind: "list", quote: "a / b", hash: "h", commit: "abc", dirty: true, text: "Too long", at: "2026-11-01T10:00:00.000Z" },
    { id: 1 },
    null,
  ]);
  assert.deepEqual(n, {
    id: "c1", route: "/dev/examples", text: "a / b", where: "ex-a · day 3, exercise 1, section 4", note: "Too long", at: "2026-11-01T10:00:00.000Z",
    section: { example: "ex-a", address: "d2.e0", index: 3, kind: "list", hash: "h", commit: "abc", dirty: true },
  });
  assert.deepEqual(notesOfOldComments("x"), []);
  assert.equal(readCopyNotes([n]).length, 1);
});
