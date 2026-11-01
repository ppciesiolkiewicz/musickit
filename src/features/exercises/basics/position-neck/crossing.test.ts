import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scaleBoxes } from "../scale-neck/boxes";
import { crossingPath, upAndDown } from "./crossing";

const A = 9;
const box = (slug: string, pc: number, n: number) => scaleBoxes(slug, pc).positions.find((p) => p.number === n)!;
const frets = (notes: { string: number; fret: number }[], s: number) => notes.filter((c) => c.string === s).map((c) => c.fret);

describe("crossingPath", () => {
  it("A minor pentatonic 1 to 2 on the G string: position 1 below, the slide from D to E, position 2 above", () => {
    const path = crossingPath(box("minor-pentatonic", A, 1), box("minor-pentatonic", A, 2), 3)!;
    assert.deepEqual(frets(path.notes, 0), [5, 8]);
    assert.deepEqual(frets(path.notes, 2), [5, 7]);
    assert.deepEqual(frets(path.notes, 3), [5, 7, 9]);
    assert.deepEqual(frets(path.notes, 4), [8, 10]);
    assert.deepEqual(frets(path.notes, 5), [8, 10]);
    assert.equal(path.lower.number, 1);
    assert.equal(path.upper.number, 2);
  });
  it("is the same path either way round", () => {
    const one = box("minor-pentatonic", A, 1), two = box("minor-pentatonic", A, 2);
    assert.deepEqual(crossingPath(two, one, 3)!.notes, crossingPath(one, two, 3)!.notes);
  });
  it("puts position 5 an octave down next to position 1", () => {
    const path = crossingPath(box("minor-pentatonic", A, 1), box("minor-pentatonic", A, 5), 3)!;
    assert.equal(path.lower.number, 5);
    assert.ok(path.lower.to <= box("minor-pentatonic", A, 1).from + 1);
    assert.deepEqual(crossingPath(box("minor-pentatonic", A, 5), box("minor-pentatonic", A, 1), 3)!.notes, path.notes);
  });
  it("is null for positions that don't touch", () => {
    assert.equal(crossingPath(box("minor-pentatonic", A, 1), box("minor-pentatonic", A, 3), 3), null);
  });
});

describe("upAndDown", () => {
  it("climbs each pitch once and comes back", () => {
    const line = upAndDown(box("minor-pentatonic", A, 1).notes).map((c) => c.midi);
    assert.equal(line[0], line[line.length - 1]);
    const top = line.indexOf(Math.max(...line));
    assert.deepEqual(line.slice(0, top + 1), [...line.slice(0, top + 1)].sort((a, b) => a - b));
  });
});
