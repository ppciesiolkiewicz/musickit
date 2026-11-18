import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProgressEntry } from "@/features/progress/log";
import { KEY_LADDERS } from "./keys";
import { keyTrackOf, playerKeys, trackKeys } from "./keyStages";
import { PATH } from "./path";

const A = 9, G = 7, E = 4;
const penta = PATH.find((t) => t.id === "pentatonic-positions")!;
const P1 = "pentatonic-positions:1", P2 = "pentatonic-positions:3";

let n = 0;
const row = (step: string, stars: number, key?: number): ProgressEntry =>
  ({ id: `r${n++}`, planId: "p", exerciseId: `e${n}`, day: 0, exercise: 0, title: "t", steps: [step], stars, at: "2026-11-19T10:00:00.000Z", ...(key === undefined ? {} : { given: { keys: { now: [key], back: [] } } }) }) as ProgressEntry;

test("trackKeys: pentatonic positions start in A, then G and E; a track with no order uses its area's ladder", () => {
  assert.deepEqual(trackKeys(penta).slice(0, 2), [[A], [G, E]]);
  assert.equal(trackKeys(penta).flat().length, 12);
  assert.equal(new Set(trackKeys(penta).flat()).size, 12, "every key once");
  const chords = PATH.find((t) => t.id === "open-chords")!;
  assert.deepEqual(trackKeys(chords), KEY_LADDERS.guitar);
});

test("keyTrackOf: the track of the first step an exercise names", () => {
  assert.deepEqual(keyTrackOf([P1, "open-chords:1"]), { track: penta, step: P1 });
  assert.equal(keyTrackOf(["nowhere:1"]), null);
  assert.equal(keyTrackOf(undefined), null);
});

test("playerKeys: a first play is in the track's first key, with one stage open", () => {
  assert.deepEqual(playerKeys(penta, P1, [], 0), { first: A, open: [A], earned: [] });
});

test("playerKeys: a stage opens on the step it was earned on; the key is earned on the whole track", () => {
  const rows = [row(P1, 5, A)];
  assert.deepEqual(playerKeys(penta, P1, rows, 0), { first: A, open: [A, G, E], earned: [A] });
  assert.deepEqual(playerKeys(penta, P2, rows, 0), { first: A, open: [A], earned: [A] }, "position 2 starts in A, with A already earned");
  const two = [...rows, row(P1, 4, G)];
  assert.deepEqual(playerKeys(penta, P1, two, 0).open, [A, G, E, 11, 0], "G found easy opens the third stage");
  assert.deepEqual(playerKeys(penta, P2, two, 0).earned, [A, G]);
});

test("playerKeys: three stars, a row with no version, or a row of another track opens and earns nothing", () => {
  assert.deepEqual(playerKeys(penta, P1, [row(P1, 3, A), row(P1, 5), row("open-chords:1", 5, A)], 0), { first: A, open: [A], earned: [] });
});

test("playerKeys: the keys answer starts the player further along", () => {
  assert.deepEqual(playerKeys(penta, P1, [], 1), { first: G, open: [A, G, E], earned: [] });
  assert.equal(playerKeys(penta, P1, [], 99).first, trackKeys(penta).at(-1)![0], "capped to the last stage");
});
