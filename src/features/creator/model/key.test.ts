import { test } from "node:test";
import assert from "node:assert/strict";
import { CIRCLE, EMPTY_KEY, fifthsPosition, fromQuery, keyContext, keySignature, keyTitle, majorSignature, sanitiseKey, scaleMidis, setMode, toQuery } from "./key";

test("no key gives no context and a general title", () => {
  assert.equal(keyContext(EMPTY_KEY), null);
  assert.equal(keyTitle(EMPTY_KEY), "No key");
  assert.equal(toQuery(EMPTY_KEY), "");
});

test("a key gives its notes, chords and title", () => {
  const k = { tonicPc: 7, family: 0, mode: 1 };
  const ctx = keyContext(k)!;
  assert.deepEqual(ctx.names, ["G", "A", "B♭", "C", "D", "E", "F"]);
  assert.equal(keyTitle(k), "G Dorian");
  assert.equal(ctx.chords.length, 7);
});

test("saved choices are repaired piece by piece", () => {
  assert.deepEqual(sanitiseKey(null), EMPTY_KEY);
  assert.deepEqual(sanitiseKey({ tonicPc: 99, family: 1, mode: 2 }), { tonicPc: null, family: 1, mode: 2 });
  assert.deepEqual(sanitiseKey({ tonicPc: 4, family: 7, mode: 3 }), { tonicPc: 4, family: 0, mode: 3 });
  assert.deepEqual(sanitiseKey({ tonicPc: 4, family: 0, mode: 40 }), { tonicPc: 4, family: 0, mode: 0 });
  assert.deepEqual(setMode({ tonicPc: 4, family: 0, mode: 5 }, 1, 6), { tonicPc: 4, family: 1, mode: 6 });
});

test("the query string round-trips and ignores nonsense", () => {
  const k = { tonicPc: 2, family: 1, mode: 4 };
  assert.deepEqual(fromQuery(toQuery(k)), k);
  assert.equal(fromQuery("?key=abc"), null);
  assert.equal(fromQuery(""), null);
});

test("circle of fifths order and key signatures", () => {
  assert.deepEqual(CIRCLE.slice(0, 4).map((t) => t.name), ["C", "G", "D", "A"]);
  assert.equal(CIRCLE.length, 12);
  assert.equal(fifthsPosition(7), 1);
  assert.equal(majorSignature(0), 0);
  assert.equal(majorSignature(7), 1);
  assert.equal(majorSignature(5), -1);
  assert.equal(majorSignature(3), -3);
  // A minor and D dorian share C major's notes
  assert.deepEqual(keySignature({ tonicPc: 9, family: 0, mode: 5 }), { count: 0, kind: "none" });
  assert.deepEqual(keySignature({ tonicPc: 2, family: 0, mode: 1 }), { count: 0, kind: "none" });
  assert.deepEqual(keySignature({ tonicPc: 4, family: 0, mode: 5 }), { count: 1, kind: "sharps" });
  assert.equal(keySignature({ tonicPc: 4, family: 1, mode: 0 }), null);
});

test("the scale for playing starts on the tonic and ends an octave up", () => {
  const ctx = keyContext({ tonicPc: 9, family: 0, mode: 5 })!;
  const m = scaleMidis(ctx);
  assert.equal(m.length, 8);
  assert.equal(m[0] % 12, 9);
  assert.equal(m[7] - m[0], 12);
  assert.ok(m[0] >= 60 && m[0] < 72);
});
