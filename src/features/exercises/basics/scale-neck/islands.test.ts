import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTool } from "@/features/plan/model/tools";
import { SCALE_NECK_FRETS } from "@/lib/chordKit/scalePositions";
import { scaleBoxes } from "./boxes";
import { findIslands, islandSteps, islandTune } from "./islands";

const A = 9;
const neck = (slug: string, pc: number) => scaleBoxes(slug, pc).cells.filter((c) => c.fret <= SCALE_NECK_FRETS);
const where = (slug: string, pc: number, notes: number[]) => findIslands(neck(slug, pc), notes).map((i) => i.cells.map((c) => `${6 - c.string}:${c.fret}`).join(" "));

describe("scale-neck islands", () => {
  it("read the degrees before the root as under it, the rest above", () => {
    assert.deepEqual(islandSteps([10, 0, 2]), [-2, 0, 2]);
    assert.deepEqual(islandSteps([0, 5, 7]), [0, 5, 7]);
    assert.deepEqual(islandSteps([7, 9, 0]), [-5, -3, 0]);
  });

  it("find three islands spread along the neck, none sharing a fret, each with the root and its notes in reach", () => {
    const islands = findIslands(neck("natural-minor-aeolian", A), [0, 2]);
    assert.equal(islands.length, 3);
    for (const [k, i] of islands.entries()) {
      assert.deepEqual(i.cells.map((c) => c.midi - i.root.midi), [0, 2]);
      assert.ok(i.to - i.from <= 4);
      if (k) assert.ok(i.from > islands[k - 1].to);
    }
    assert.ok(islands[0].from <= 3 && islands[2].to >= 10, "spread from the nut up the neck");
  });

  it("stay by fret 7 when they all fit there, and never go past fret 12", () => {
    assert.ok(findIslands(neck("major-ionian", A), [0, 5, 7], 2).every((i) => i.to <= 7));
    for (const [slug, notes] of [["natural-minor-aeolian", [10, 0, 2]], ["major-ionian", [11, 0, 2]], ["natural-minor-aeolian", [0, 5, 7]]] as const)
      for (const pc of [0, 4, 7, 9, 11]) assert.ok(findIslands(neck(slug, pc), [...notes]).every((i) => i.to <= 12), `${slug} ${pc}`);
  });

  it("ring 1 4 5 in the same places in A major and A minor (guitar strings, 1 = high e : fret)", () => {
    const major = where("major-ionian", A, [0, 5, 7]);
    assert.deepEqual(major, ["5:0 4:0 4:2", "6:5 5:5 5:7", "2:10 1:10 1:12"]);
    assert.deepEqual(where("natural-minor-aeolian", A, [0, 5, 7]), major);
  });

  it("play an island low to high, then back to the root", () => {
    const [i] = findIslands(neck("natural-minor-aeolian", A), [10, 0, 2]);
    assert.deepEqual(islandTune(i).map((c) => c.name), ["G", "A", "B", "A"]);
    const [j] = findIslands(neck("natural-minor-aeolian", A), [0, 5, 7]);
    assert.deepEqual(islandTune(j).map((c) => c.name), ["A", "D", "E", "A"]);
  });

  it("are parsed as degrees in their order, the root added when missing, count 1-4", () => {
    const t = parseTool({ type: "scale-neck", scale: "natural-minor-aeolian", key: "a", islands: { notes: ["b7", "1", "2"], count: 2 } });
    assert.ok(t?.type === "scale-neck");
    assert.deepEqual(t.islands, { notes: [10, 0, 2], count: 2 });
    const plain = parseTool({ type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["4", "5"] } });
    assert.ok(plain?.type === "scale-neck");
    assert.deepEqual(plain.islands, { notes: [0, 5, 7] });
    const stored = parseTool(t);
    assert.deepEqual(stored, t, "a stored tool reads back the same");
    const none = parseTool({ type: "scale-neck", scale: "major-ionian", key: "a", islands: { notes: ["1"] } });
    assert.ok(none && !("islands" in none));
  });
});
