import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockIdOf, blockKeyOf } from "./blockId";
import { libraryBlocksOf, slotBlocks } from "./libraryBlocks";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (id: string, title: string, over: Partial<PlanExercise> = {}): PlanExercise =>
  ({ id, title, minutes: 5, cells: [{ type: "text", text: title }], area: "guitar", tags: ["technique"], ...over }) as PlanExercise;
const plan = (id: string, days: PlanExercise[][]): StoredPlan =>
  ({ id, startedOn: "2026-11-01", done: {}, config: { title: "W", days: days.map((exercises, i) => ({ theme: `T${i}`, exercises })) } }) as StoredPlan;
const idOf = (e: PlanExercise) => blockIdOf(blockKeyOf(e));

describe("libraryBlocksOf", () => {
  it("one LibraryBlock per distinct block, current plan first; edited ones are source edit with their parent", () => {
    const a = ex("s1", "A");
    const b = ex("s2", "B");
    const parent = idOf(a);
    const edited = ex("s3", "A, slower", { parentBlockId: parent });
    const current = plan("p2", [[a, edited], [ex("s4", "A")]]);
    const older = plan("p1", [[ex("s9", "B", { minutes: 20, why: "other" }), b]]);
    const got = libraryBlocksOf([current, older]);
    assert.deepEqual(got.map((x) => x.id), [parent, idOf(edited), idOf(b)]);
    assert.deepEqual(got[0], { id: parent, key: blockKeyOf(a), source: "ai" });
    assert.deepEqual(got[1], { id: idOf(edited), key: blockKeyOf(edited), parentId: parent, source: "edit" });
    assert.equal(got[2].source, "ai");
  });

  it("works out ids itself and drops a parent that is not a block id or is the block's own", () => {
    const a = ex("s1", "A", { blockId: "0".repeat(32), parentBlockId: "nope" });
    const self = ex("s2", "B");
    const selfish = { ...self, parentBlockId: idOf(self) };
    const got = libraryBlocksOf([plan("p", [[a, selfish]])]);
    assert.deepEqual(got.map((x) => [x.id, x.source, x.parentId]), [[idOf(a), "ai", undefined], [idOf(self), "ai", undefined]]);
  });

  it("skips a day without an exercise list", () => {
    const p = plan("p", [[ex("s1", "A")]]);
    (p.config.days as unknown[]).push({ theme: "broken" });
    assert.equal(libraryBlocksOf([p]).length, 1);
  });
});

describe("slotBlocks", () => {
  it("slotBlocks maps every slot id of every plan to its block id", () => {
    const a = ex("s1", "A");
    const b = ex("s2", "B");
    assert.deepEqual({ ...slotBlocks([plan("p2", [[a]]), plan("p1", [[b, ex("s3", "A")]])]) }, { s1: idOf(a), s2: idOf(b), s3: idOf(a) });
  });

  it("takes slot ids that name Object's own properties as ordinary keys", () => {
    const a = ex("constructor", "A");
    const b = ex("__proto__", "B");
    const c = ex("toString", "C");
    const got = slotBlocks([plan("p", [[a, b, c]])]);
    assert.deepEqual(Object.keys(got).sort(), ["__proto__", "constructor", "toString"]);
    assert.equal(got["constructor"], idOf(a));
    assert.equal(got["__proto__"], idOf(b));
    assert.equal(got["toString"], idOf(c));
    assert.equal(slotBlocks([plan("p", [[ex("s1", "A")]])])["constructor"], undefined, "a missing slot is undefined, not Object's");
  });
});
