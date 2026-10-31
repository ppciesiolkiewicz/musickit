import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickChoices, pickTune } from "./melodyPick";
import { BOOK, RUNS, RUN_STAGES, STAGES } from "./singingMelodies";

const easySkips = BOOK.filter((t) => t.difficulty === 0 && t.stage.id === "skips");

describe("pickTune", () => {
  it("takes the first tune of that difficulty in the stage", () => {
    assert.ok(easySkips.length > 0);
    assert.deepEqual(pickTune(BOOK, { difficulty: "Easy", stage: "skips", index: 0 }), { n: easySkips[0].n, exact: true });
  });
  it("wraps the index", () => {
    assert.equal(pickTune(BOOK, { difficulty: "easy", stage: "skips", index: easySkips.length })?.n, easySkips[0].n);
  });
  it("drops an unknown stage", () => {
    const r = pickTune(BOOK, { difficulty: "easy", stage: "nope" });
    assert.equal(r?.exact, false);
    assert.equal(BOOK.find((t) => t.n === r!.n)!.difficulty, 0);
  });
  it("falls back for an unknown difficulty", () => {
    const r = pickTune(BOOK, { difficulty: "impossible" });
    assert.equal(r?.exact, false);
    assert.ok(BOOK.some((t) => t.n === r!.n));
  });
  it("works on the runs book and is null for an empty one", () => {
    assert.ok(RUNS.some((t) => t.n === pickTune(RUNS, { stage: RUN_STAGES[0].id })!.n));
    assert.equal(pickTune([], {}), null);
  });
  it("lists the choices", () => {
    assert.match(pickChoices(STAGES), /^difficulties: easy, medium, hard, expert; stages: do-re \(/);
  });
});
