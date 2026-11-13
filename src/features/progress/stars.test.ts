import { test } from "node:test";
import assert from "node:assert/strict";
import { STARS, STAR_LABELS, cleanRating, isStars, starText } from "./stars";

test("isStars accepts only the integers 1 to 5", () => {
  for (const s of [1, 2, 3, 4, 5]) assert.ok(isStars(s));
  for (const v of [0, 6, 2.5, "3", null, undefined]) assert.equal(isStars(v), false);
  assert.deepEqual([...STARS], [1, 2, 3, 4, 5]);
});

test("labels read from can't do it yet to easy now", () => {
  assert.equal(STAR_LABELS[1], "Can't do it yet");
  assert.equal(STAR_LABELS[2], "Struggling");
  assert.equal(STAR_LABELS[3], "Same again next time");
  assert.equal(STAR_LABELS[4], "Solid");
  assert.equal(STAR_LABELS[5], "Easy now");
  assert.equal(starText(2), "2★ Struggling");
});

test("cleanRating keeps a valid rating and drops broken ones", () => {
  const r = { stars: 4, at: "2026-11-10T10:00:00.000Z" };
  assert.deepEqual(cleanRating(r), r);
  assert.deepEqual(cleanRating({ ...r, extra: 1 }), r);
  assert.equal(cleanRating({ stars: 4 }), null);
  assert.equal(cleanRating({ stars: 9, at: "x" }), null);
  assert.equal(cleanRating({ stars: 3, at: "" }), null);
  assert.equal(cleanRating(null), null);
});
