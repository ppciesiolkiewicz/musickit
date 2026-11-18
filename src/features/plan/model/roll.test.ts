import { test } from "node:test";
import assert from "node:assert/strict";
import type { TrackKeys } from "./keyStages";
import type { Given, Moves } from "./moves";
import { ROLL, firstVersion, rollVersion, type RollInput, type VersionRow } from "./roll";

const A = 9, G = 7, E = 4;
const seq = (...v: number[]) => { let i = 0; return () => { if (i >= v.length) throw new Error("the roll drew more than the test gave"); return v[i++]; }; };
const moves: Moves = { key: "any", bpm: { from: 60, to: 90, step: 10 } };
const keys: TrackKeys = { first: A, open: [A, G, E], earned: [A] };
const FIRST: Given = { keys: { now: [A], back: [] }, bpm: { now: 60, back: [] } };
const input = (history: VersionRow[], more: Partial<RollInput> = {}): RollInput => ({ moves, written: { key: A, bpm: 60 }, keys, history, ...more });
const row = (id: string, stars: number, given?: Given): VersionRow => ({ id, stars, ...(given ? { given } : {}) });

test("the numbers of the roll are one table", () => {
  assert.deepEqual(ROLL, { low: { back: 0.7 }, mid: { move: 0.3 }, high: { move: 0.8 }, weights: { bpm: 3, key: 2 }, earnedOnFirst: 0.5, maxNow: 3, maxBack: 2 });
});

test("a first play: the track's first key and the starting tempo, no draw", () => {
  const r = rollVersion(input([]), seq());
  assert.deepEqual(r.given, FIRST);
  assert.equal(r.trace.outcome, "first");
  assert.equal(r.trace.last, null);
  assert.deepEqual(r.trace.draws, []);
});

test("a first play with keys earned on the track: half the time it opens with them too, the first key kept first", () => {
  const more = { keys: { first: A, open: [A], earned: [A, G, E, 11] } };
  assert.deepEqual(rollVersion(input([], more), seq(0.4)).given.keys, { now: [A, G, E], back: [] });
  assert.deepEqual(rollVersion(input([], more), seq(0.6)).given.keys, { now: [A], back: [] });
  assert.deepEqual(firstVersion(input([], more)).keys, { now: [A], back: [] }, "without a die: the first key alone");
});

test("easy now: mostly a move, tempo or key by weight", () => {
  const h = [row("r1", 5, FIRST)];
  const tempo = rollVersion(input(h), seq(0.5, 0.1));
  assert.deepEqual(tempo.given, { keys: { now: [A], back: [] }, bpm: { now: 70, back: [60] }, moved: 1 });
  assert.equal(tempo.trace.outcome, "move");
  assert.equal(tempo.trace.moved, "bpm");
  assert.deepEqual(tempo.trace.movesIn, [{ part: "bpm", weight: 3, to: 70 }, { part: "key", weight: 2, to: G }]);
  assert.deepEqual(tempo.trace.odds, { back: 0, same: 0.2, move: 0.8 });
  assert.deepEqual(tempo.trace.draws, [0.5, 0.1]);
  const key = rollVersion(input(h), seq(0.5, 0.7));
  assert.deepEqual(key.given, { keys: { now: [G, A], back: [] }, bpm: { now: 60, back: [] }, moved: 1 });
  assert.equal(key.trace.moved, "key");
  const same = rollVersion(input(h), seq(0.9));
  assert.deepEqual(same.given, FIRST);
  assert.equal(same.trace.outcome, "same");
  assert.equal(same.trace.moved, null);
});

test("can't do it yet: mostly the version before, else the same again", () => {
  const moved: Given = { keys: { now: [A], back: [] }, bpm: { now: 70, back: [60] }, moved: 1 };
  const h = [row("r2", 1, moved), row("r1", 5, FIRST)];
  const back = rollVersion(input(h), seq(0.2));
  assert.deepEqual(back.given, FIRST);
  assert.equal(back.trace.outcome, "back");
  assert.deepEqual(back.trace.odds, { back: 0.7, same: 0.3, move: 0 });
  assert.deepEqual(rollVersion(input(h), seq(0.8)).given, moved);
  assert.deepEqual(rollVersion(input([row("r2", 2, moved)]), seq(0.2)).given, FIRST, "with no earlier row, the first-play version");
});

test("same again: mostly the same, sometimes a move", () => {
  const h = [row("r1", 3, FIRST)];
  assert.equal(rollVersion(input(h), seq(0.2, 0)).trace.outcome, "move");
  assert.equal(rollVersion(input(h), seq(0.4)).trace.outcome, "same");
});

test("with nowhere to go, a move is the same version", () => {
  const top: Given = { keys: { now: [E, G, A], back: [] }, bpm: { now: 90, back: [80, 70] }, moved: 5 };
  const r = rollVersion(input([row("r1", 5, top)]), seq(0.1));
  assert.deepEqual(r.given, top);
  assert.equal(r.trace.outcome, "same");
  assert.deepEqual(r.trace.movesIn, []);
});

test("a move keeps a bit of the version before: at most three keys now, two tempos back", () => {
  const wide: TrackKeys = { first: A, open: [A, G, E, 11, 0], earned: [A, G, E] };
  const three: Given = { keys: { now: [E, G, A], back: [] }, bpm: { now: 90, back: [80, 70] }, moved: 5 };
  const r = rollVersion(input([row("r1", 5, three)], { keys: wide }), seq(0.1, 0.99));
  assert.deepEqual(r.given.keys, { now: [11, E, G], back: [A] });
  const up = rollVersion(input([row("r1", 5, { bpm: { now: 80, back: [70, 60] }, moved: 2 })], { moves: { bpm: moves.bpm }, keys: null }), seq(0.1, 0));
  assert.deepEqual(up.given, { bpm: { now: 90, back: [80, 70] }, moved: 3 });
});

test("a block that can't change key, or an exercise on no track, gets no keys and no key move", () => {
  const noKey = rollVersion(input([row("r1", 5, { bpm: { now: 60, back: [] } })], { moves: { bpm: moves.bpm } }), seq(0.1, 0.9));
  assert.equal(noKey.given.keys, undefined);
  assert.deepEqual(noKey.trace.movesIn.map((m) => m.part), ["bpm"]);
  assert.equal(rollVersion(input([], { keys: null }), seq()).given.keys, undefined);
});

test("a row from before versions were kept stands for the first play (Review Focus 3)", () => {
  const r = rollVersion(input([row("old", 5)]), seq(0.5, 0.1));
  assert.deepEqual(r.given, { keys: { now: [A], back: [] }, bpm: { now: 70, back: [60] }, moved: 1 });
  assert.deepEqual(r.trace.last, { stars: 5, given: FIRST });
});

test("the same history and the same draws give the same version (Review Focus 4)", () => {
  const h = [row("r1", 5, FIRST)];
  assert.deepEqual(rollVersion(input(h), seq(0.5, 0.1)), rollVersion(input(h), seq(0.5, 0.1)));
  const cleared = rollVersion(input([row("r0", 3, FIRST)]), seq(0.9));
  assert.deepEqual(cleared.given, FIRST, "the newest rating cleared: the roll reads the row before it");
});

test("the version before is an easier one: never a harder version the player already found hard", () => {
  const v = (bpm: number, back: number[], moved: number): Given => ({ keys: { now: [A], back: [] }, bpm: { now: bpm, back }, ...(moved ? { moved } : {}) });
  // 60 easy, 70 hard, back at 60 hard again: "back" is the first version, not 70
  const a = [row("r3", 2, v(60, [], 0)), row("r2", 1, v(70, [60], 1)), row("r1", 5, v(60, [], 0))];
  assert.deepEqual(rollVersion(input(a), seq(0.2)).given, FIRST);
  // 60, 70, 80 hard, 70 hard: "back" is 60, not 80
  const b = [row("r4", 1, v(70, [60], 1)), row("r3", 1, v(80, [70, 60], 2)), row("r2", 5, v(70, [60], 1)), row("r1", 5, v(60, [], 0))];
  assert.deepEqual(rollVersion(input(b), seq(0.2)).given, FIRST);
  // 60, 70, 80 hard: "back" is 70
  const c = [row("r3", 1, v(80, [70, 60], 2)), row("r2", 5, v(70, [60], 1)), row("r1", 5, v(60, [], 0))];
  assert.deepEqual(rollVersion(input(c), seq(0.2)).given, v(70, [60], 1));
});
