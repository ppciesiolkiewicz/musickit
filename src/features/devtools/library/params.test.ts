import { test } from "node:test";
import assert from "node:assert/strict";
import { devArgs, libraryHref, minutes, orDash, readParams } from "./params";

test("readParams takes the first value and ignores empty ones", () => {
  assert.deepEqual(readParams({ topic: ["a", "b"], player: "" }), { topic: "a", player: undefined, item: undefined });
  assert.deepEqual(readParams({}), { topic: undefined, player: undefined, item: undefined });
});

test("include_not_enabled is no longer read or written", () => {
  assert.deepEqual(readParams({ include_not_enabled: "1" }), { topic: undefined, player: undefined, item: undefined });
  assert.equal(libraryHref({ topic: "t" }, { includeNotEnabled: true } as never), "/admin/content/library?topic=t");
});

test("readParams reads the item to draw", () => {
  assert.equal(readParams({ item: "guitar-beginner" }).item, "guitar-beginner");
  assert.equal(readParams({}).item, undefined);
});

test("devArgs always reads everything, with the player when set", () => {
  assert.deepEqual(devArgs({}), { include_not_enabled: true });
  assert.deepEqual(devArgs({ player: "p" }), { player: "p", include_not_enabled: true });
});

test("libraryHref keeps the other parameters", () => {
  const p = { topic: "t", player: "p" };
  assert.equal(libraryHref(p, { topic: "x y" }), "/admin/content/library?topic=x+y&player=p");
  assert.equal(libraryHref({}), "/admin/content/library");
  assert.equal(libraryHref({ ...p, item: "a" }, { topic: undefined, item: "b" }), "/admin/content/library?player=p&item=b");
});

test("minutes rounds to one decimal, orDash shows null as a dash", () => {
  assert.equal(minutes(0), "0");
  assert.equal(minutes(90), "1.5");
  assert.equal(minutes(100), "1.7");
  assert.equal(orDash(null), "–");
  assert.equal(orDash(0), "0");
});
