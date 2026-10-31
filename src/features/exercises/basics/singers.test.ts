import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BOOK, RUNS, RUN_STAGES, STAGES } from "@/features/theory/singingMelodies";
import { arpeggioPartNotes } from "./arpeggio";
import { isRunId, isTuneId, melodyChoices, runChoices } from "./choices";
import { docOf } from "../docs";

describe("arpeggioPartNotes", () => {
  it("keeps only the part's degrees", () => {
    const notes = arpeggioPartNotes("Am", { part: ["1", "b3"] });
    assert.ok(notes.length > 0);
    assert.deepEqual([...new Set(notes.map((n) => n.midi % 12))].sort((a, b) => a - b), [0, 9]);
  });
  it("joins two neighbouring boxes, ascending, with a seam", () => {
    const one = arpeggioPartNotes("Am", { boxes: [1] });
    const two = arpeggioPartNotes("Am", { boxes: [2] });
    const both = arpeggioPartNotes("Am", { boxes: [1, 2] });
    const key = (n: { string: number; fret: number }) => `${n.string}:${n.fret}`;
    const keys = new Set(both.map(key));
    for (const n of [...one, ...two]) assert.ok(keys.has(key(n)));
    for (let i = 1; i < both.length; i++) assert.ok(both[i].midi >= both[i - 1].midi);
    assert.ok(both.some((n) => n.seam));
    assert.equal(both.length, keys.size);
  });
  it("marks no seam on one box, nor on boxes sharing no place", () => {
    assert.ok(!arpeggioPartNotes("Am", { boxes: [1] }).some((n) => n.seam));
    // Am boxes 2 (open) and 3 (12th fret) share no place
    assert.ok(!arpeggioPartNotes("Am", { boxes: [2, 3] }).some((n) => n.seam));
  });
});

describe("singer choices", () => {
  it("knows tune and run ids", () => {
    assert.ok(isTuneId(BOOK[0].n) && !isTuneId(9999) && !isTuneId("1"));
    assert.ok(isRunId(RUNS[0].n) && !isRunId(BOOK[0].n));
  });
  it("one choice per stage", () => {
    assert.equal(melodyChoices().length, STAGES.length);
    assert.equal(melodyChoices()[0].stage, STAGES[0].title);
    assert.equal(melodyChoices()[0].id, BOOK[0].n);
    assert.equal(runChoices().length, RUN_STAGES.length);
  });
  it("documents the new basics", () => {
    for (const n of ["arpeggio-neck", "melody-singer", "run-singer"]) assert.equal(docOf(n)?.kind, "basic", n);
  });
});
