import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_STAGE } from "@/features/stage";
import { decodeNote, encodeNote, noteFromHash, noteHeader, noteOf, noteText, notesStart, readNoteText } from "./notes";

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

test("a note's text is its key and its widgets in page order, and reads back as the same note", () => {
  const key = { tonicPc: 9, family: 0, mode: 5 };
  const stage = noteOf([{ kind: "text", text: "## One" }, { kind: "neck", key }, { kind: "text", text: "Two" }], key);
  // the page order is `order`, not the list's
  const moved = { ...stage, order: ["w3", "w1", "w2"] };
  const text = noteText(moved);
  assert.deepEqual(JSON.parse(text), { key, widgets: [{ kind: "text", text: "Two" }, { kind: "text", text: "## One" }, { kind: "neck", key }] });
  const back = readNoteText(text, []);
  assert.ok("stage" in back);
  assert.deepEqual(back.left, []);
  assert.deepEqual(back.stage.key, key);
  assert.equal(back.stage.layout, "grid");
  assert.equal(back.stage.gridAuto, true);
  assert.deepEqual(back.stage.order, ["w1", "w2", "w3"]);
  assert.equal(noteText(back.stage), text);
});

test("a note's text that cannot be read says why, and a widget that cannot be read is left out and named", () => {
  assert.match((readNoteText("{ nope", []) as { error: string }).error, /^Not JSON/);
  assert.match((readNoteText("[]", []) as { error: string }).error, /widgets/);
  assert.match((readNoteText('{"key":null}', []) as { error: string }).error, /widgets/);
  const r = readNoteText(JSON.stringify({ widgets: [{ kind: "text", text: "a" }, { kind: "no-such" }, 7, { kind: "camera" }, { kind: "tool", tool: { type: "run-singer", run: 108 } }] }), []);
  assert.ok("stage" in r);
  assert.deepEqual(r.left, ["2 (kind no-such)", "3 (kind ?)", "4 (kind camera)"]);
  assert.deepEqual(r.stage.layers.map((l) => l.subject.kind), ["text", "tool"]);
  assert.deepEqual(r.stage.order, ["w1", "w5"]);
});

test("a note's header is its opening title and the paragraph straight after it; the body keeps the rest", () => {
  const key = { tonicPc: 0, family: 0, mode: 0 };
  const texts = (s: ReturnType<typeof noteOf>) => s.layers.map((l) => (l.subject.kind === "text" ? l.subject.text : l.subject.kind));
  const full = noteHeader(noteOf([{ kind: "text", text: "# The title\n\nThe line about it,\nover two lines.\n\nFirst words.\n\n## A heading" }, { kind: "text", text: "# Not the opening" }], key));
  assert.equal(full.title, "The title");
  assert.equal(full.intro, "The line about it, over two lines.");
  assert.deepEqual(texts(full.body), ["First words.\n\n## A heading", "# Not the opening"]);
  // a heading straight after the title is the body, not the line
  const headed = noteHeader(noteOf([{ kind: "text", text: "# T\n\n## Section\n\nWords." }], key));
  assert.deepEqual([headed.title, headed.intro, texts(headed.body)], ["T", null, ["## Section\n\nWords."]]);
  const only = noteHeader(noteOf([{ kind: "text", text: "# Just a title" }], key));
  assert.deepEqual([only.title, only.intro, texts(only.body)], ["Just a title", null, [""]]);
  for (const s of [noteOf([{ kind: "text", text: "## A heading\n\n# Later" }], key), noteOf([{ kind: "neck", key }, { kind: "text", text: "# T" }], key), noteOf([], key)]) assert.deepEqual(noteHeader(s), { title: null, intro: null, body: s });
});
