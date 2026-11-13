import { test } from "node:test";
import assert from "node:assert/strict";
import { REGISTERS, voiceMap } from "@/features/theory/registers";
import { VOICES, type Voice } from "@/features/theory/singing";
import { GAP, glidePath, midiAt, rollNotes, roundAt, roundSeconds } from "./glide";

const tenor = voiceMap("tenor");

test("a slide runs from head voice to chest voice: over the second break, under the first", () => {
  assert.deepEqual(rollNotes(tenor), { high: 70, low: 55, hold: 57 });
  for (const v of Object.keys(VOICES) as Voice[]) {
    const { high, low } = rollNotes(voiceMap(v));
    assert.ok(high > REGISTERS[v].secondo, `${v} starts in head voice`);
    assert.ok(low < REGISTERS[v].primo, `${v} ends in chest voice`);
    assert.ok(low >= VOICES[v].low && high <= VOICES[v].high, `${v} stays in its range`);
  }
});

test("down: a second on each end, a quarter second a semitone between", () => {
  const p = glidePath("down", tenor);
  assert.deepEqual(p.points.map((x) => [x.t, x.midi]), [[0, 70], [1, 70], [4.75, 55], [5.75, 55]]);
  assert.equal(midiAt(p, 99), 55);
});

test("up starts low; a siren comes back", () => {
  assert.equal(glidePath("up", tenor).points[0].midi, 55);
  const s = glidePath("siren", tenor);
  assert.equal(s.points[0].midi, 55);
  assert.equal(s.points[s.points.length - 1].midi, 55);
  assert.equal(midiAt(s, 4.75), 70);
});

test("a hold is one chest-voice note for its seconds", () => {
  const h = glidePath("hold", tenor, 4);
  assert.equal(h.duration, 4);
  assert.equal(midiAt(h, 2), 57);
});

test("a round: listen, a gap, your turn, a rest", () => {
  const p = glidePath("hold", tenor, 4);
  assert.deepEqual(roundAt(p, 1), { phase: "listen", at: 1 });
  assert.equal(roundAt(p, 4.2)!.phase, "gap");
  const you = roundAt(p, 4 + GAP + 1)!;
  assert.equal(you.phase, "you");
  assert.ok(Math.abs(you.at - 1) < 1e-9);
  assert.equal(roundAt(p, 8 + GAP + 0.1)!.phase, "rest");
  assert.equal(roundAt(p, roundSeconds(p)), null);
});
