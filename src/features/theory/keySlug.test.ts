import { test } from "node:test";
import assert from "node:assert/strict";
import { keyOr, keySlug, parseKeySlug, scaleHref } from "./keySlug";

test("each key has one readable slug, spelled like the app spells it", () => {
  assert.deepEqual(
    Array.from({ length: 12 }, (_, pc) => keySlug(pc)),
    ["c", "d-flat", "d", "e-flat", "e", "f", "f-sharp", "g", "a-flat", "a", "b-flat", "b"],
  );
});

test("reads every spelling back, including enharmonics and old numeric links", () => {
  for (let pc = 0; pc < 12; pc++) assert.equal(parseKeySlug(keySlug(pc)), pc);
  assert.equal(parseKeySlug("C-sharp"), 1);
  assert.equal(parseKeySlug("c#"), 1);
  assert.equal(parseKeySlug("C-flat"), 11);
  assert.equal(parseKeySlug("db"), 1);
  assert.equal(parseKeySlug("E♭"), 3);
  assert.equal(parseKeySlug("e-sharp"), 5);
  assert.equal(parseKeySlug("b-sharp"), 0);
  assert.equal(parseKeySlug("4"), 4);
  assert.equal(parseKeySlug("12"), null);
  assert.equal(parseKeySlug("h"), null);
  assert.equal(parseKeySlug(undefined), null);
  assert.equal(keyOr("nonsense"), 4);
});

test("mode page links put the key in the path", () => {
  assert.equal(scaleHref("dorian", 1), "/theory/scales/dorian/d-flat");
  assert.equal(scaleHref("dorian", 4, "#guitar"), "/theory/scales/dorian/e#guitar");
});
