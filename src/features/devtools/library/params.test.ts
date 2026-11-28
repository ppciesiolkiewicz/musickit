import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedParams, canNamePlayer, devArgs, itemRedirect, libraryHref, minutes, orDash, readParams, tabOfItem } from "./params";

test("readParams takes the first value and ignores empty ones", () => {
  assert.deepEqual(readParams({ topic: ["a", "b"], player: "" }), { topic: "a", player: undefined, item: undefined, group: undefined });
  assert.deepEqual(readParams({}), { topic: undefined, player: undefined, item: undefined, group: undefined });
});

test("include_not_enabled is no longer read or written", () => {
  assert.deepEqual(readParams({ include_not_enabled: "1" }), { topic: undefined, player: undefined, item: undefined, group: undefined });
  assert.equal(libraryHref("blocks", { topic: "t" }, { includeNotEnabled: true } as never), "/admin/content/library/blocks?topic=t");
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
  assert.equal(libraryHref("blocks", p, { topic: "x y" }), "/admin/content/library/blocks?topic=x+y&player=p");
  assert.equal(libraryHref("overview", {}), "/admin/content/library");
  assert.equal(libraryHref("blocks", { ...p, item: "a" }, { topic: undefined, item: "b" }), "/admin/content/library/blocks?player=p&item=b");
});

test("the overview takes no topic or item, the plans page no topic", () => {
  const p = { topic: "t", player: "p", item: "i" };
  assert.equal(libraryHref("overview", p), "/admin/content/library?player=p");
  assert.equal(libraryHref("plans", p), "/admin/content/library/plans?player=p&item=i");
});

test("an older ?item= link goes to its item's subpage with the whole query", () => {
  assert.equal(tabOfItem("guitar-beginner"), "plans");
  assert.equal(tabOfItem("guitar-beginner-down-up-picking/beginner"), "blocks");
  assert.equal(itemRedirect({ item: "guitar-beginner", note: "n1" }), "/admin/content/library/plans?item=guitar-beginner&note=n1");
  assert.equal(itemRedirect({ item: "abc", player: "p" }), "/admin/content/library/blocks?item=abc&player=p");
  assert.equal(itemRedirect({ topic: "t" }), null);
});

test("minutes rounds to one decimal, orDash shows null as a dash", () => {
  assert.equal(minutes(0), "0");
  assert.equal(minutes(90), "1.5");
  assert.equal(minutes(100), "1.7");
  assert.equal(orDash(null), "–");
  assert.equal(orDash(0), "0");
});

test("a content-only viewer's player parameter is dropped; dev and admin keep it", () => {
  const p = { topic: "t", player: "abc", item: "i" };
  assert.deepEqual(allowedParams(p, ["content"]), { topic: "t", player: undefined, item: "i" });
  assert.equal(allowedParams(p, ["content", "admin"]).player, "abc");
  assert.equal(allowedParams(p, ["dev"]).player, "abc");
  assert.equal(canNamePlayer(["content"]), false);
});

test("a near-copy group is read and kept in a Blocks link", () => {
  assert.equal(readParams({ group: "g03" }).group, "g03");
  assert.equal(libraryHref("blocks", { group: "g03" }, { item: "a" }), "/admin/content/library/blocks?group=g03&item=a");
  assert.equal(libraryHref("plans", { group: "g03" }), "/admin/content/library/plans");
});
