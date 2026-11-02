import { test } from "node:test";
import assert from "node:assert/strict";
import { clampA4, oldInputId, readHz, sanitiseChoice, TUNER_INSTRUMENTS, withInstrument, DEFAULT_CHOICE } from "./choice";

test("offers chromatic and four instruments", () => {
  assert.deepEqual(TUNER_INSTRUMENTS.map((i) => i.id), ["chromatic", "guitar", "bass", "ukulele", "violin"]);
});

test("sanitises loose input", () => {
  assert.deepEqual(sanitiseChoice({ instrument: "bass", tuning: "five", a4: "442" }), { instrument: "bass", tuning: "five", a4: 442 });
  assert.deepEqual(sanitiseChoice({ instrument: "guitar", tuning: "nope", a4: 1000 }), { instrument: "guitar", tuning: "standard", a4: 480 });
  assert.equal(sanitiseChoice({ instrument: "cello" }), null);
  assert.equal(sanitiseChoice(null), null);
  assert.equal(clampA4(432.04), 432);
});

test("reads against the nearest open string, or the nearest note on chromatic", () => {
  const g = readHz(111, DEFAULT_CHOICE);
  assert.equal(g.string, 1);
  assert.equal(g.name, "A");
  assert.ok(g.cents > 0);
  const c = readHz(111, withInstrument(DEFAULT_CHOICE, "chromatic"));
  assert.equal(c.string, null);
  assert.equal(c.name, "A");
  assert.ok(Math.abs(readHz(432, { ...withInstrument(DEFAULT_CHOICE, "chromatic"), a4: 432 }).cents) < 0.01);
});

test("reads the device the old input picker saved", () => {
  assert.equal(oldInputId(JSON.stringify({ deviceId: "abc", channel: 0 })), "abc");
  assert.equal(oldInputId(JSON.stringify({ deviceId: "", channel: "mix" })), null);
  assert.equal(oldInputId(null), null);
  assert.equal(oldInputId("{oops"), null);
});
