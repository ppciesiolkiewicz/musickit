import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GROOVES, findGroove, grooveBassCells, grooveDrumCells } from "./grooves";
import { stepTime, swingOffset } from "./pattern";

describe("swing", () => {
  it("pushes only the off-beat eighths late", () => {
    assert.equal(swingOffset(2, 1), 1 / 6);
    assert.equal(swingOffset(6, 0.5), 1 / 12);
    assert.equal(swingOffset(0, 1), 0);
    assert.equal(swingOffset(3, 1), 0);
  });

  it("times a step on the plain grid at swing 0, later with swing", () => {
    assert.equal(stepTime(10, 6, 0.5, 0), 10 + 6 * 0.125);
    assert.equal(stepTime(10, 6, 0.5, 1), 10 + 6 * 0.125 + 0.5 / 6);
    assert.equal(stepTime(10, 22, 0.5, 1), 10 + 22 * 0.125 + 0.5 / 6);
    assert.equal(stepTime(10, -2, 0.5, 1), 10 - 2 * 0.125 + 0.5 / 6);
  });
});

describe("grooves", () => {
  it("fits every groove to the grids", () => {
    for (const g of GROOVES) {
      assert.equal(grooveDrumCells(g).length, 6, g.id);
      assert.equal(grooveBassCells(g).length, 8, g.id);
      for (const line of Object.values(g.drums)) assert.equal(line.length, 16, g.id);
    }
  });

  it("puts the rock bass on the root lane at every even step", () => {
    const cells = grooveBassCells(findGroove("rock")!);
    const hitsAt = (lane: number) => cells[lane].slice(0, 16).flatMap((v, s) => (v ? [s] : []));
    assert.deepEqual(hitsAt(7), [0, 2, 4, 6, 8, 10, 12, 14]);
    for (let lane = 0; lane < 7; lane++) assert.deepEqual(hitsAt(lane), []);
  });

  it("marks loud hits as accents and soft ones as normal", () => {
    const cells = grooveBassCells(findGroove("rock")!);
    assert.equal(cells[7][0], 2);
    assert.equal(cells[7][2], 1);
  });

  it("maps a role to its note lane", () => {
    const shuffle = grooveBassCells(findGroove("shuffle")!);
    assert.equal(shuffle[6][2], 1); // the third, semitone 3
    assert.equal(shuffle[4][4] > 0, true); // the fifth, semitone 7
  });

  it("turns ghost drum hits into normal ones", () => {
    const swing = grooveDrumCells(findGroove("swing")!);
    assert.equal(swing[0][0], 1); // kick "o"
    assert.equal(swing[3][0], 2); // hat "X"
  });

  it("knows no waltz", () => {
    assert.equal(findGroove("waltz"), null);
  });
});
