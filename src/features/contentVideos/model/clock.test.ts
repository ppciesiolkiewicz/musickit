import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "@/features/plan/model/tools";
import { beatAt, readPieces, squeeze, type Sample } from "./clock";
import { DEFAULT_LOOK, MIN_BOX, fitBox, hasOverlay, readLook, readOverlay } from "./overlay";

/** samples every 50 ms from `from` to `to` seconds, the beat from `beat(t)` */
const run = (from: number, to: number, beat: (t: number) => number | null): Sample[] => {
  const out: Sample[] = [];
  for (let t = from; t < to - 1e-9; t += 0.05) out.push({ t: Math.round(t * 1000) / 1000, beat: beat(t) });
  return out;
};
const near = (a: number | null, b: number, tol = 0.07) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${a} is near ${b}`);

test("a steady tempo is one piece, and the beat is read between samples", () => {
  const s = run(0, 10, (t) => t * 2); // 120 bpm
  const p = squeeze(s);
  assert.equal(p.length, 1);
  near(beatAt(p, 3.333), 6.666);
});

test("a tool stopped, started, sped up, held and stopped again", () => {
  const s = [
    ...run(0, 2, () => null),
    ...run(2, 6, (t) => (t - 2) * 1.5), // 90 bpm from 2 s
    ...run(6, 8, (t) => 6 + (t - 6) * 2), // 120 bpm from 6 s, beat 6
    ...run(8, 9, () => 10), // paused on beat 10
    ...run(9, 10, () => null),
  ];
  const p = squeeze(s);
  assert.equal(p.length, 5);
  assert.equal(beatAt(p, 1), null);
  near(beatAt(p, 4), 3);
  near(beatAt(p, 7), 8);
  near(beatAt(p, 8.5), 10);
  assert.equal(beatAt(p, 9.5), null);
});

test("a loop going back starts a new piece where it shows", () => {
  const s = run(0, 8, (t) => (t * 2) % 8);
  const p = squeeze(s);
  assert.equal(p.length, 2);
  near(beatAt(p, 3.9), 7.8);
  near(beatAt(p, 4.5), 1);
});

test("before the first sample there is no beat", () => {
  assert.equal(beatAt(squeeze(run(1, 2, (t) => t)), 0.5), null);
  assert.equal(beatAt([], 3), null);
});

test("readPieces takes only pieces in time order", () => {
  assert.deepEqual(readPieces([[0, null, 0], [1.5, 0, 2]]), [[0, null, 0], [1.5, 0, 2]]);
  assert.equal(readPieces([[2, 0, 1], [1, 0, 1]]), null);
  assert.equal(readPieces([[0, "1", 1]]), null);
  assert.equal(readPieces([[0, 1]]), null);
  assert.equal(readPieces("x"), null);
});

const riff = TOOLS["guitar-play-along"].parse({ type: "guitar-play-along", shape: { shape: "riff", key: "e", scale: "Mixolydian", notes: [{ string: 6, fret: 0, beats: 1 }, { string: 5, fret: 5, beats: 1 }] }, bpm: 60, view: "tab" })!;
const melody = TOOLS["melody-singer"].parse({ type: "melody-singer", pick: { difficulty: "easy", stage: "sol" }, key: "d", voice: "tenor" })!;

test("an overlay keeps the tool's settings as saved, for the riff and the melody singer only", () => {
  assert.ok(riff && melody);
  assert.deepEqual(readOverlay({ tool: riff, clock: [[0, 0, 1]] }), { tool: riff, clock: [[0, 0, 1]] });
  assert.deepEqual(readOverlay({ tool: melody, clock: [] })?.tool, melody);
  const drill = TOOLS["picking-drill"].parse({ type: "picking-drill", level: "beginner", bpm: 60 })!;
  assert.equal(hasOverlay(drill), false);
  assert.equal(readOverlay({ tool: drill, clock: [] }), null);
  assert.equal(readOverlay({ tool: riff, clock: [[0, 0]] }), null);
  assert.equal(readOverlay({ tool: { type: "melody-singer" }, clock: [] }), null);
  assert.equal(readOverlay(null), null);
});

test("a look keeps each part that reads and defaults the rest", () => {
  assert.deepEqual(readLook({ place: "left", size: "large", bg: "clear" }), { place: "left", size: "large", bg: "clear" });
  assert.deepEqual(readLook({ place: "middle", size: "large" }), { ...DEFAULT_LOOK, size: "large" });
  assert.deepEqual(readLook(null), DEFAULT_LOOK);
  assert.deepEqual(readOverlay({ tool: riff, clock: [], look: { place: "right" } })?.look, { ...DEFAULT_LOOK, place: "right" });
  assert.equal(readOverlay({ tool: riff, clock: [] })?.look, undefined);
});

test("a free look keeps its box inside the picture", () => {
  assert.deepEqual(readLook({ place: "free", size: "small", bg: "dark", box: { x: 0.2, y: 0.3, w: 0.4, h: 0.5 } }), { place: "free", size: "small", bg: "dark", box: { x: 0.2, y: 0.3, w: 0.4, h: 0.5 } });
  assert.deepEqual(readLook({ place: "free", box: { x: 0.9, y: -1, w: 0.5, h: 0.01 } })?.box, { x: 0.5, y: 0, w: 0.5, h: MIN_BOX });
  assert.deepEqual(readLook({ place: "free", box: { x: "a" } }), { ...DEFAULT_LOOK, place: "free" });
  assert.deepEqual(fitBox({ x: 0, y: 0, w: 2, h: 2 }), { x: 0, y: 0, w: 1, h: 1 });
});
