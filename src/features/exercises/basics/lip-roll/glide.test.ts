import { test } from "node:test";
import assert from "node:assert/strict";
import { REGISTERS, voiceMap } from "@/features/theory/registers";
import { VOICES, type Voice } from "@/features/theory/singing";
import { GAP, REST, glidePath, midiAt, rollNotes, roundAt, roundSeconds, youStart } from "./glide";

const tenor = voiceMap("tenor");

test("a slide runs from head voice to chest voice: over the second break, under the first", () => {
  assert.deepEqual(rollNotes(tenor), { high: 70, low: 59, hold: 57 });
  assert.deepEqual(rollNotes(tenor, 2), { high: 70, low: 55, hold: 55 });
  assert.equal(rollNotes(tenor, 20).low, 48);
  for (const v of Object.keys(VOICES) as Voice[]) {
    const { high, low } = rollNotes(voiceMap(v));
    assert.ok(high > REGISTERS[v].secondo, `${v} starts in head voice`);
    assert.ok(low < REGISTERS[v].primo, `${v} ends in chest voice`);
    assert.ok(low >= VOICES[v].low && high <= VOICES[v].high, `${v} stays in its range`);
  }
});

test("down: a second on each end, a quarter second a semitone between", () => {
  const p = glidePath("down", tenor);
  assert.deepEqual(p.points.map((x) => [x.t, x.midi]), [[0, 70], [1, 70], [3.75, 59], [4.75, 59]]);
  assert.equal(midiAt(p, 99), 59);
  assert.equal(glidePath("down", tenor, 5, "medium", 1).low, 57);
});

test("up starts low; a siren comes back", () => {
  assert.equal(glidePath("up", tenor).points[0].midi, 59);
  const s = glidePath("siren", tenor);
  assert.equal(s.points[0].midi, 59);
  assert.equal(s.points[s.points.length - 1].midi, 59);
  assert.equal(midiAt(s, 3.75), 70);
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

test("speed: slow takes longer, fast shorter, never under its least", () => {
  const ramp = (sp: "slow" | "medium" | "fast") => { const p = glidePath("down", tenor, 5, sp); return p.points[2].t - p.points[1].t; };
  assert.equal(ramp("medium"), 2.75);
  assert.ok(Math.abs(ramp("slow") - 4.4) < 1e-9);
  assert.equal(ramp("fast"), 1.65);
  assert.equal(glidePath("hold", tenor, 4, "fast").duration, 4);
});

test("modes: always is one pass with the tone, silent one without, echo both", () => {
  const p = glidePath("hold", tenor, 4);
  assert.equal(roundAt(p, 1, "always")!.phase, "along");
  assert.equal(roundAt(p, 1, "silent")!.phase, "you");
  assert.equal(roundAt(p, 4.5, "always")!.phase, "rest");
  assert.equal(roundSeconds(p, "always"), 4 + REST);
  assert.equal(youStart(p, "echo"), 4 + GAP);
  assert.equal(youStart(p, "always"), null);
});
