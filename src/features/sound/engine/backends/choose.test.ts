import { test } from "node:test";
import assert from "node:assert/strict";
import { backendFor } from "./choose";

test("built-in instruments play on Tone.js", () => {
  assert.equal(backendFor({ strict: false, runtime: false }), "tone");
});

test("the sampler's instruments and strict pads stay on the buffer player", () => {
  assert.equal(backendFor({ strict: true, runtime: true }), "buffer");
  assert.equal(backendFor({ strict: false, runtime: true }), "buffer");
  assert.equal(backendFor({ strict: true, runtime: false }), "buffer");
});
