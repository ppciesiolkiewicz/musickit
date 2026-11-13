import { test } from "node:test";
import assert from "node:assert/strict";
import { BOOK, RUNS, RUN_STAGES, STAGES } from "@/features/theory/singingMelodies";
import { PRESET_INFO } from "./presetInfo";
import { PRESET_NOTES, PRESET_TUNES, presetWarnings } from "./presetNotes";
import { notePageParts } from "./model/note";

test("every preset note is a block the parser keeps whole", () => {
  assert.deepEqual(Object.keys(PRESET_NOTES).sort(), Object.keys(PRESET_INFO).sort());
  // a video and a run have no key to follow: the parser says so, and that is all it may say
  const expected = (w: string) => /can't change key\.$/.test(w);
  for (const slug of Object.keys(PRESET_NOTES)) assert.deepEqual(presetWarnings(slug).filter((w) => !expected(w)), [], slug);
});

test("each preset opens with its title and line, the same ones its page's metadata uses", () => {
  for (const [slug, block] of Object.entries(PRESET_NOTES)) {
    const p = notePageParts(block);
    assert.deepEqual([p.title, p.intro], [PRESET_INFO[slug].title, PRESET_INFO[slug].description], slug);
    assert.equal(p.body.cells.length, block.cells.length - 1, slug);
  }
});

test("the tunes a preset note's text describes are still at their numbers in the singing books", () => {
  const at = (stages: typeof STAGES, book: typeof BOOK, n: number) => {
    const t = book.find((x) => x.n === n)!;
    return [t.stage.id, stages.find((s) => s.id === t.stage.id)!.tunes[book.filter((x) => x.stage.id === t.stage.id).indexOf(t)]];
  };
  assert.deepEqual(at(STAGES, BOOK, PRESET_TUNES.doReMi), ["mi", "3 1 2 3 | 2h 1h | 3 2 1 2 | 1w"]);
  assert.deepEqual(at(STAGES, BOOK, PRESET_TUNES.solLaSol), ["la", "5 6 5 3 | 1w"]);
  assert.deepEqual(at(RUN_STAGES, RUNS, PRESET_TUNES.pentatonicRun), ["pentatonic-run", "1's 6s 5s 3s 5s 3s 2s 1s 2h | 1w"]);
});
