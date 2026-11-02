import { test } from "node:test";
import assert from "node:assert/strict";
import { copyNotesMarkdown, readCopyNotes, squeeze, type CopyNote } from "./copyNotes";

const note = (o: Partial<CopyNote>): CopyNote => ({ id: "1", route: "/plan", text: "Sing with the mic", where: "button", note: "too long", at: "2026-11-02T00:00:00Z", ...o });

test("keeps only whole notes", () => {
  assert.equal(readCopyNotes([note({}), { id: 1 }, null]).length, 1);
  assert.deepEqual(readCopyNotes("x"), []);
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
