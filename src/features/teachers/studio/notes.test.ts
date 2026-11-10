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

test("the tunes a preset note's text describes are still at their numbers in the singing books", async () => {
  const { BOOK, RUNS, RUN_STAGES, STAGES } = await import("@/features/theory/singingMelodies");
  const { PRESET_TUNES } = await import("./presetNotes");
  const at = (stages: typeof STAGES, book: typeof BOOK, n: number) => {
    const t = book.find((x) => x.n === n)!;
    return [t.stage.id, stages.find((s) => s.id === t.stage.id)!.tunes[book.filter((x) => x.stage.id === t.stage.id).indexOf(t)]];
  };
  assert.deepEqual(at(STAGES, BOOK, PRESET_TUNES.doReMi), ["mi", "3 1 2 3 | 2h 1h | 3 2 1 2 | 1w"]);
  assert.deepEqual(at(STAGES, BOOK, PRESET_TUNES.solLaSol), ["la", "5 6 5 3 | 1w"]);
  assert.deepEqual(at(RUN_STAGES, RUNS, PRESET_TUNES.pentatonicRun), ["pentatonic-run", "1's 6s 5s 3s 5s 3s 2s 1s 2h | 1w"]);
});

test("a preset's editable address names the preset, and nothing else does", async () => {
  const { editablePreset, editableSlug } = await import("./presetInfo");
  assert.equal(editableSlug("minor-pentatonic"), "minor-pentatonic-editable");
  assert.equal(editablePreset("minor-pentatonic-editable"), "minor-pentatonic");
  assert.equal(editablePreset("minor-pentatonic"), null);
  assert.equal(editablePreset("no-such-note-editable"), null);
  assert.equal(editablePreset("-editable"), null);
});
