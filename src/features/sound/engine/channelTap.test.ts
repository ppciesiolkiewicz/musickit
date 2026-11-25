import { test } from "node:test";
import assert from "node:assert/strict";
import { partGain, tapSource } from "./channelTap";

test("both mixes; Input 1 and 2 pick a channel of a two-input device", () => {
  assert.equal(tapSource("both", 2), "mix");
  assert.equal(tapSource("1", 2), 0);
  assert.equal(tapSource("2", 2), 1);
});

test("a one-channel device is always heard whole", () => {
  assert.equal(tapSource("1", 1), "mix");
  assert.equal(tapSource("2", 1), "mix");
});

test("each input's part: the chosen one whole, both at half so they add up to the mix, a mono device's one whole", () => {
  assert.deepEqual([0, 1].map((i) => partGain("both", 2, i)), [0.5, 0.5]);
  assert.deepEqual([0, 1].map((i) => partGain("1", 2, i)), [1, 0]);
  assert.deepEqual([0, 1].map((i) => partGain("2", 2, i)), [0, 1]);
  assert.deepEqual([0, 1].map((i) => partGain("2", 1, i)), [1, 0]);
});
