import { test } from "node:test";
import assert from "node:assert/strict";
import { devArgs, libraryHref, minutes, orDash, readParams } from "./params";

test("readParams takes the first value and ignores empty ones", () => {
  assert.deepEqual(readParams({ topic: ["a", "b"], player: "", include_not_enabled: "1" }), { topic: "a", player: undefined, includeNotEnabled: true, item: undefined });
  assert.equal(readParams({ include_not_enabled: "true" }).includeNotEnabled, false);
  assert.deepEqual(readParams({}), { topic: undefined, player: undefined, includeNotEnabled: false, item: undefined });
});

test("readParams reads the item to draw", () => {
  assert.equal(readParams({ item: "guitar-beginner" }).item, "guitar-beginner");
  assert.equal(readParams({}).item, undefined);
});

test("devArgs holds only what is set", () => {
  assert.deepEqual(devArgs({ includeNotEnabled: false }), {});
  assert.deepEqual(devArgs({ player: "p", includeNotEnabled: true }), { player: "p", include_not_enabled: true });
});

test("libraryHref keeps the other parameters", () => {
  const p = { topic: "t", player: "p", includeNotEnabled: true };
  assert.equal(libraryHref(p, { topic: "x y" }), "/dev/library?topic=x+y&player=p&include_not_enabled=1");
  assert.equal(libraryHref(p, { includeNotEnabled: false }), "/dev/library?topic=t&player=p");
  assert.equal(libraryHref({ includeNotEnabled: false }), "/dev/library");
  assert.equal(libraryHref({ ...p, item: "a" }, { topic: undefined, item: "b" }), "/dev/library?player=p&include_not_enabled=1&item=b");
});

test("minutes rounds to one decimal, orDash shows null as a dash", () => {
  assert.equal(minutes(0), "0");
  assert.equal(minutes(90), "1.5");
  assert.equal(minutes(100), "1.7");
  assert.equal(orDash(null), "–");
  assert.equal(orDash(0), "0");
});
