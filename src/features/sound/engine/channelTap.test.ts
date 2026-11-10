import { test } from "node:test";
import assert from "node:assert/strict";
import { tapSource } from "./channelTap";

test("both mixes; Input 1 and 2 pick a channel of a two-input device", () => {
  assert.equal(tapSource("both", 2), "mix");
  assert.equal(tapSource("1", 2), 0);
  assert.equal(tapSource("2", 2), 1);
});

test("a one-channel device is always heard whole", () => {
  assert.equal(tapSource("1", 1), "mix");
  assert.equal(tapSource("2", 1), "mix");
});
