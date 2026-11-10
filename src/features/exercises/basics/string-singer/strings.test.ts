import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { docOf } from "../../docs";
import { drillNotes } from "./strings";

describe("drillNotes", () => {
  it("strings: up and back, end to end", () => {
    const n = drillNotes("strings");
    assert.deepEqual(n.map((x) => x.midi), [40, 45, 50, 55, 59, 64, 59, 55, 50, 45, 40]);
    n.forEach((x, i) => assert.equal(x.at, i * x.beats));
  });
  it("pairs: each two neighbouring strings, fourths and a G-B third", () => {
    const n = drillNotes("pairs");
    const steps = [0, 2, 4, 6, 8].map((i) => n[i + 1].midi - n[i].midi);
    assert.deepEqual(steps, [5, 5, 5, 4, 5]);
  });
  it("fifth-fret: the same note twice, the 4th fret on G", () => {
    const n = drillNotes("fifth-fret");
    for (let i = 0; i < n.length; i += 2) assert.equal(n[i].midi, n[i + 1].midi);
    assert.equal(n[6].label, "3rd·4");
    assert.equal(n[0].label, "6th·5");
  });
});

describe("string-singer docs", () => {
  it("documents it as a basic", () => {
    assert.equal(docOf("string-singer")?.kind, "basic");
  });
});
