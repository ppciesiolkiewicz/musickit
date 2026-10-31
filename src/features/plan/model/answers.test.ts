import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateAnswers } from "./answers";
import { CONCEPTS } from "./concepts";
import { DEFAULT_ANSWERS } from "./questions";

const base = { styles: "blues", notes: "hi", minutes: 30 };

describe("migrateAnswers", () => {
  it("old guitar+voice intermediate", () => {
    const a = migrateAnswers({ ...base, instruments: ["guitar", "voice"], level: "intermediate", goals: ["songs"], struggles: ["timing"] });
    assert.deepEqual(a.levels, { guitar: "intermediate", voice: "intermediate", theory: "intermediate" });
    assert.equal(a.styles, "blues");
    assert.equal(a.notes, "hi");
    assert.equal(a.minutes, 30);
  });
  it("old piano only", () => {
    assert.deepEqual(migrateAnswers({ ...base, instruments: ["piano"], level: "new" }).levels, { guitar: "new", theory: "new" });
  });
  it("old voice+piano drops piano", () => {
    assert.deepEqual(migrateAnswers({ ...base, instruments: ["voice", "piano"], level: "beginner" }).levels, { voice: "beginner", theory: "beginner" });
  });
  it("old record without instruments keeps its level and returns copies", () => {
    assert.deepEqual(migrateAnswers({ ...base, instruments: [], level: "advanced" }).levels, { guitar: "advanced", theory: "advanced" });
    assert.deepEqual(migrateAnswers({ ...base, level: "new" }).levels, { guitar: "new", theory: "new" });
    const g = migrateAnswers(null);
    assert.notEqual(g, DEFAULT_ANSWERS);
    assert.notEqual(g.levels, DEFAULT_ANSWERS.levels);
    assert.notEqual(g.focus, DEFAULT_ANSWERS.focus);
    assert.notEqual(g.ratings, DEFAULT_ANSWERS.ratings);
    assert.notEqual(migrateAnswers({ levels: {} }).levels, DEFAULT_ANSWERS.levels);
  });
  it("old single instrument voice", () => {
    assert.deepEqual(migrateAnswers({ ...base, instrument: "voice", level: "advanced" }).levels, { voice: "advanced", theory: "advanced" });
  });
  it("new shape round-trips", () => {
    const [c1, c2] = CONCEPTS;
    const a = {
      levels: { guitar: "advanced", theory: "new" },
      ratings: { [c1.id]: 4, [c2.id]: 1 },
      voice: { type: "tenor", range: { low: 45, high: 70 } },
      focus: [c1.id],
      minutes: 45,
      styles: "jazz",
      notes: "",
    };
    assert.deepEqual(migrateAnswers(a), a);
  });
  it("drops bad ratings, concepts, focus, voices and ranges", () => {
    const ids = CONCEPTS.slice(0, 5).map((c) => c.id);
    const a = migrateAnswers({
      levels: { guitar: "beginner" },
      ratings: { [ids[0]]: 3, nope: 3, [ids[1]]: 6, [ids[2]]: 0, [ids[3]]: 2.5 },
      focus: [ids[0], "nope", ids[1], ids[2], ids[3], ids[4]],
      voice: { type: "falsetto", range: { low: 60, high: 60 } },
    });
    assert.deepEqual(a.ratings, { [ids[0]]: 3 });
    assert.deepEqual(a.focus, [ids[0], ids[1], ids[2]]);
    assert.equal(a.voice, undefined);
    assert.deepEqual(migrateAnswers({ voice: { type: "bass", range: { low: 70, high: 50 } }, levels: { guitar: "new" } }).voice, { type: "bass" });
  });
  it("all areas skipped falls back to the default levels", () => {
    assert.deepEqual(migrateAnswers({ levels: {} }).levels, DEFAULT_ANSWERS.levels);
    assert.deepEqual(migrateAnswers({ levels: { guitar: "expert" } }).levels, DEFAULT_ANSWERS.levels);
  });
  it("garbage gives the defaults", () => {
    for (const g of [null, "x", [], undefined, 3]) assert.deepEqual(migrateAnswers(g), DEFAULT_ANSWERS);
  });
});
