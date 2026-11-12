import { test } from "node:test";
import assert from "node:assert/strict";
import { bufferEnvelope } from "./buffer";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);

test("a held note ramps up over the attack and has no end of its own", () => {
  const e = bufferEnvelope({ attack: 0, release: 0.3 }, { midi: 60, at: 1, velocity: 0.8 });
  assert.deepEqual(e.ops, [["set", 1, 0], ["ramp", 1.01, 0.8]]);
  assert.equal(e.stopAt, null);
  assert.equal(e.peak, 0.8);
});

test("a note with a duration holds, then releases and stops", () => {
  const e = bufferEnvelope({ attack: 0, release: 0.3 }, { midi: 60, at: 1, velocity: 0.8, duration: 0.5 });
  assert.deepEqual(e.ops.slice(2).map(([k]) => k), ["set", "ramp"]);
  close(e.ops[2][1], 1.5);
  assert.equal(e.ops[2][2], 0.8);
  close(e.ops[3][1], 1.8);
  assert.equal(e.ops[3][2], 0.001);
  close(e.stopAt!, 1.85);
});

test("a quiet press floors at a twentieth of full", () => {
  close(bufferEnvelope({ attack: 0, release: 0.3 }, { midi: 60, at: 0, velocity: 0.02 }).peak, 0.8 * 0.05);
});

test("released before its attack ends, a note is cut where the ramp got to", () => {
  const e = bufferEnvelope({ attack: 0.2, release: 0.3 }, { midi: 60, at: 0, velocity: 0.8, duration: 0.05 });
  close(e.ops[2][2] as number, 0.8 * (0.05 / 0.2));
});
