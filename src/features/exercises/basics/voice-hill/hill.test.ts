import { test } from "node:test";
import assert from "node:assert/strict";
import { VOICES } from "@/features/theory/singing";
import { ballX, heightAt, inZone, stepHold, towards, zoneFor, zoneX } from "./hill";

const tenor = VOICES.tenor;

test("zones sit in the voice: low E3 and under, middle F3 to Bb3, high F#4 and over for a tenor", () => {
  assert.deepEqual(zoneFor("low", tenor), { lo: -Infinity, hi: 52, ref: 52 });
  assert.deepEqual(zoneFor("middle", tenor), { lo: 53, hi: 58, ref: 55 });
  assert.deepEqual(zoneFor("high", tenor), { lo: 66, hi: Infinity, ref: 66 });
});

test("in the zone with slack at its closed ends, and which way to move", () => {
  const z = zoneFor("middle", tenor);
  assert.equal(inZone(52.7, z, 40), true);
  assert.equal(inZone(52.5, z, 40), false);
  assert.equal(towards(50, z, 40), 1);
  assert.equal(towards(61, z, 40), -1);
  assert.equal(towards(55, z, 40), 0);
  assert.equal(inZone(30, zoneFor("low", tenor), 40), true);
});

test("the ball: low notes left, the zone's edge in the middle, clamped", () => {
  const low = zoneFor("low", tenor);
  assert.equal(ballX(52, low), 0.5);
  assert.ok(ballX(48, low) < 0.5);
  assert.equal(ballX(10, low), -0.02);
  assert.deepEqual(zoneX(low), [0, 0.5]);
  assert.deepEqual(zoneX(zoneFor("high", tenor)), [0.5, 1]);
});

test("ground: a slope for low and high, a valley for middle", () => {
  assert.equal(heightAt("low", 0), 0);
  assert.equal(heightAt("low", 1), 1);
  assert.equal(heightAt("middle", 0.5), 0);
  assert.equal(heightAt("middle", 0), 1);
});

test("a hold fills in the zone, drains at half speed out of it, waits on a breath", () => {
  assert.equal(stepHold(0, "in", 1.5, 3), 0.5);
  assert.equal(stepHold(0.5, "out", 1.5, 3), 0.25);
  assert.equal(stepHold(0.5, "none", 1.5, 3), 0.5);
  assert.equal(stepHold(0.9, "in", 1, 3), 1);
  assert.equal(stepHold(0.1, "out", 3, 3), 0);
});
