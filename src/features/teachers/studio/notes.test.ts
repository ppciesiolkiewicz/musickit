import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_STAGE } from "@/features/stage";
import { decodeNote, encodeNote, noteFromHash, notesStart } from "./notes";

const stage = { ...EMPTY_STAGE, layers: [
  { id: "a", subject: { kind: "logo" as const }, rect: { x: 0.83, y: 0.03, w: 0.15, h: 0.1 }, visible: true, z: 0 },
  { id: "b", subject: { kind: "camera" as const }, rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.4 }, visible: true, z: 1 },
] };

test("a note round-trips and drops live widgets", async () => {
  const back = await decodeNote(await encodeNote(stage), []);
  assert.deepEqual(back?.layers.map((l) => l.subject.kind), ["logo"]);
});
test("the notes creator opens an empty grid with One per row on, and leaves any other stage as it was", () => {
  assert.equal(notesStart(EMPTY_STAGE).gridAuto, true);
  assert.equal(notesStart(EMPTY_STAGE).layout, "grid");
  assert.equal(notesStart(stage).gridAuto, undefined, "a stage with widgets keeps its switch off");
  assert.equal(notesStart({ ...EMPTY_STAGE, layout: "free" }).gridAuto, undefined);
});

test("a note keeps the grid's auto layout", async () => {
  const back = await decodeNote(await encodeNote({ ...stage, gridAuto: true }), []);
  assert.equal(back?.gridAuto, true);
  assert.equal((await decodeNote(await encodeNote(stage), []))?.gridAuto, undefined);
});
test("junk is not a note", async () => {
  assert.equal(await decodeNote("zzz!!", []), null);
  assert.equal(noteFromHash("#note=abc_-1"), "abc_-1");
  assert.equal(noteFromHash("#x"), null);
});

test("every preset note survives the sanitiser with all its widgets", async () => {
  const { PLUGINS } = await import("@/features/creator");
  const { PRESET_NOTES } = await import("./presetNotes");
  for (const [slug, p] of Object.entries(PRESET_NOTES)) {
    const back = await decodeNote(await encodeNote(p.stage), PLUGINS.map((x) => x.id));
    assert.equal(back?.layers.length, p.stage.layers.length, slug);
  }
});
