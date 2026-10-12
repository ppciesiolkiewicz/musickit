import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CAGED_LETTERS } from "./caged";
import { NEIGHBOUR_DEGREES, neighbours, regionOf, ruleLetter } from "./neighbours";
import { OPEN_MIDI } from "./shapeTools";

const by = (list: ReturnType<typeof neighbours>, roman: string) => list.find((n) => n.roman === roman)!;

describe("shape neighbours", () => {
  it("grid order is IV I V over ii vi iii", () => {
    assert.deepEqual(NEIGHBOUR_DEGREES.map((d) => d.roman), ["IV", "I", "V", "ii", "vi", "iii"]);
  });
  it("C major in the C shape is open position: F(E) C(C) G(G) Dm(D) Am(A) Em(E)", () => {
    const n = neighbours(0, "C");
    assert.deepEqual(n.map((x) => `${x.name}:${x.letter}`), ["F:E", "C:C", "G:G", "Dm:D", "Am:A", "Em:E"]);
  });
  it("D in the C shape has A in the G shape as its V", () => {
    assert.equal(by(neighbours(2, "C"), "V").letter, "G");
    assert.equal(by(neighbours(2, "C"), "V").name, "A");
  });
  it("follows the rule in every key, away from the nut and the 12th fret", () => {
    let checked = 0;
    for (let pc = 0; pc < 12; pc++) for (const L of CAGED_LETTERS) {
      const r = regionOf(pc, L);
      if (!r || r.from < 2 || r.to > 12) continue; // at the edges a predicted shape can need frets below the nut or above the neck
      neighbours(pc, L).forEach((n) => assert.equal(n.letter, ruleLetter(L, n.roman), `key ${pc} ${L}: ${n.roman} ${n.name}`));
      checked++;
    }
    assert.ok(checked >= 25, `checked ${checked}`);
  });
  it("every box found plays the right chord", () => {
    for (let pc = 0; pc < 12; pc++) for (const L of CAGED_LETTERS) neighbours(pc, L).forEach((n) => {
      if (!n.box) return;
      const pcs = new Set(n.box.frets.flatMap((f, i) => (f === null ? [] : [(OPEN_MIDI[i] + f) % 12])));
      const want = (n.quality === "major" ? [0, 4, 7] : [0, 3, 7]).map((s) => (n.rootPc + s) % 12);
      assert.deepEqual([...pcs].sort((a, b) => a - b), want.sort((a, b) => a - b));
    });
  });
  it("rule letters", () => {
    assert.equal(ruleLetter("C", "V"), "G");
    assert.equal(ruleLetter("C", "IV"), "E");
    assert.equal(ruleLetter("C", "vi"), "A");
    assert.equal(ruleLetter("C", "ii"), "D");
    assert.equal(ruleLetter("C", "iii"), "E");
    assert.equal(ruleLetter("E", "V"), "C");
  });
});
