import { test } from "node:test";
import assert from "node:assert/strict";
import { VOICES } from "@/features/theory/singing";
import { GAP, REST, glidePath, midiAt, roundAt, roundSeconds } from "./glide";

const tenor = VOICES.tenor;

test("a slide down a 5th: a second on each end, 2.5 seconds between", () => {
  const p = glidePath("down", tenor);
  assert.equal(p.high, 58);
  assert.equal(p.low, 51);
  assert.deepEqual(p.points.map((x) => [x.t, x.midi]), [[0, 58], [1, 58], [3.5, 51], [4.5, 51]]);
  assert.equal(midiAt(p, 2.25), 54.5);
  assert.equal(midiAt(p, 99), 51);
});

test("an octave takes longer; up starts low; a siren comes back", () => {
  assert.equal(glidePath("down", tenor, 12).duration, 5);
  assert.equal(glidePath("up", tenor).points[0].midi, 51);
  const s = glidePath("siren", tenor);
  assert.equal(s.points[0].midi, 51);
  assert.equal(s.points[s.points.length - 1].midi, 51);
  assert.equal(midiAt(s, 3.5), 58);
});

test("a hold is one note for its seconds", () => {
  const h = glidePath("hold", tenor, 7, 4);
  assert.equal(h.duration, 4);
  assert.equal(midiAt(h, 2), 53);
});

test("a round: listen, a gap, your turn, a rest", () => {
  const p = glidePath("hold", tenor, 7, 4);
  assert.deepEqual(roundAt(p, 1), { phase: "listen", at: 1 });
  assert.equal(roundAt(p, 4.2)!.phase, "gap");
  const you = roundAt(p, 4 + GAP + 1)!;
  assert.equal(you.phase, "you");
  assert.ok(Math.abs(you.at - 1) < 1e-9);
  assert.equal(roundAt(p, 8 + GAP + 0.1)!.phase, "rest");
  assert.equal(roundAt(p, roundSeconds(p)), null);
  assert.equal(roundSeconds(p), 8 + GAP + REST);
});
