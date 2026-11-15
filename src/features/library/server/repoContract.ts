import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { baseFixture, PLAYER_A as A, PLAYER_B as B, type LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type { BlockFilter, BlockOrder, Scope } from "./types";

/** What every `LibraryRepo` must do, run against `make(data)`: the memory repo now, Postgres later. */
export function libraryRepoContract(make: (data: LibraryData) => Promise<LibraryRepo>): void {
  const repo = () => make(baseFixture());
  const ids = async (scope: Scope, filter: BlockFilter = {}, order: BlockOrder = "newest") =>
    (await (await repo()).listBlocks(scope, filter, order, 100)).map((b) => b.id).sort();
  const all: Scope = { player: A, includeNotEnabled: true };

  describe("library repo: visibility", () => {
    test("no scope sees only blocks enabled for reuse", async () => {
      assert.deepEqual(await ids({}), ["S1", "S2"]);
    });
    test("a player also sees their own blocks, and never another player's", async () => {
      assert.deepEqual(await ids({ player: A }), ["PA", "R", "S1", "S2"]);
      assert.deepEqual(await ids({ player: B }), ["R", "S1", "S2"]);
    });
    test("includeNotEnabled adds the app's blocks and never a private one", async () => {
      assert.deepEqual(await ids({ includeNotEnabled: true }), ["S1", "S2", "X"]);
      assert.deepEqual(await ids({ player: B, includeNotEnabled: true }), ["R", "S1", "S2", "X"]);
    });
    test("getBlock returns a visible block with its content, and null for one that is not visible", async () => {
      const r = await repo();
      const b = await r.getBlock({ player: A }, "PA");
      assert.equal(b?.id, "PA");
      assert.equal(b?.parentId, "S1");
      assert.equal(b?.content.title, "Block PA");
      assert.equal(await r.getBlock({ player: B }, "PA"), null);
      assert.equal(await r.getBlock({ player: B, includeNotEnabled: true }, "PA"), null);
      assert.equal(await r.getBlock({}, "X"), null);
      assert.equal((await r.getBlock({ includeNotEnabled: true }, "X"))?.id, "X");
      assert.equal(await r.getBlock(all, "nope"), null);
    });
    test("userExists", async () => {
      const r = await repo();
      assert.equal(await r.userExists(A), true);
      assert.equal(await r.userExists("c0000000-0000-4000-8000-00000000000c"), false);
    });
  });

  describe("library repo: filters", () => {
    test("equality filters", async () => {
      assert.deepEqual(await ids(all, { area: "rhythm" }), ["R"]);
      assert.deepEqual(await ids(all, { topic: "guitar-scales" }), ["PA", "S1", "S2"]);
      assert.deepEqual(await ids(all, { level: "beginner" }), ["PA", "R", "S1", "X"]);
      assert.deepEqual(await ids(all, { model: "m1" }), ["PA", "S1"]);
      assert.deepEqual(await ids(all, { promptVersion: 4 }), ["S2"]);
      assert.deepEqual(await ids(all, { docsAgents: 2 }), ["S1", "S2"]);
      assert.deepEqual(await ids(all, { docsTeaching: 3 }), ["S2"]);
    });
    test("concepts match a block with any of them", async () => {
      assert.deepEqual(await ids(all, { concepts: ["major-scale", "intervals"] }), ["S1", "X"]);
      assert.deepEqual(await ids(all, { concepts: ["pentatonic"] }), ["S1", "S2"]);
    });
    test("tags match a block with all of them", async () => {
      assert.deepEqual(await ids(all, { tags: ["warmup", "slow"] }), ["S1"]);
      assert.deepEqual(await ids(all, { tags: ["slow"] }), ["R", "S1"]);
    });
    test("filters combine", async () => {
      assert.deepEqual(await ids(all, { topic: "guitar-scales", level: "beginner", model: "m1" }), ["PA", "S1"]);
    });
    test("a block's summary has its fields and provenance", async () => {
      const [s1] = await (await repo()).listBlocks({}, { level: "beginner" }, "newest", 10);
      assert.equal(s1.id, "S1");
      assert.equal(s1.title, "Block S1");
      assert.deepEqual([s1.area, s1.topic, s1.level], ["guitar", "guitar-scales", "beginner"]);
      assert.deepEqual(s1.concepts, ["major-scale", "pentatonic"]);
      assert.deepEqual(s1.tags, ["warmup", "slow"]);
      assert.deepEqual(s1.provenance, { model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 });
    });
  });

  describe("library repo: use and mine", () => {
    test("use adds both players, and the two bad timer rows change nothing", async () => {
      const s1 = await (await repo()).getBlock({}, "S1");
      assert.equal(s1?.use.times, 2);
      assert.equal(s1?.use.seconds, 900);
      assert.equal(s1?.use.rated, 0);
      const r = await (await repo()).getBlock({ player: A }, "R");
      assert.equal(r?.use.rated, 3);
      assert.deepEqual(r?.use.stars, [0, 1, 1, 0, 1]);
      assert.equal(r?.use.times, 0);
    });
    test("bad timer rows throw nothing, in a list or a count", async () => {
      const r = await repo();
      assert.equal(await r.countBlocks(all, {}), 5);
      assert.equal((await r.listBlocks(all, {}, "least-used", 10)).length, 5);
    });
    test("mine is the player's own, with the later rating", async () => {
      const r = await repo();
      const rr = await r.getBlock({ player: A }, "R");
      assert.equal(rr?.mine?.stars, 5);
      assert.equal(rr?.mine?.ratedAt, "2026-03-05T10:00:00.000Z");
      const rb = await r.getBlock({ player: B }, "R");
      assert.equal(rb?.mine?.stars, 2);
      const s1a = await r.getBlock({ player: A }, "S1");
      assert.deepEqual(s1a?.mine, { stars: null, ratedAt: null, times: 1, seconds: 600 });
      const s1b = await r.getBlock({ player: B }, "S1");
      assert.deepEqual(s1b?.mine, { stars: null, ratedAt: null, times: 1, seconds: 300 });
    });
    test("mine is absent without a player in scope", async () => {
      const r = await repo();
      assert.equal((await r.getBlock({}, "S1"))?.mine, undefined);
      assert.ok((await r.listBlocks({}, {}, "newest", 10)).every((b) => b.mine === undefined));
    });
  });

  describe("library repo: the player's history", () => {
    test("unused is reusable and not owned", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "unused" }), ["S1"]);
      assert.deepEqual(await ids({ player: B }, { player: "unused" }), ["S1", "S2"]);
    });
    test("had is owned", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "had" }), ["PA", "R", "S2"]);
    });
    test("repeat is owned and last rated 1 to 3 stars", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "repeat" }), ["S2"]);
      assert.deepEqual(await ids({ player: B }, { player: "repeat" }), ["R"]);
    });
    test("a player filter without a player in scope matches nothing", async () => {
      const r = await repo();
      for (const player of ["unused", "had", "repeat"] as const) {
        assert.deepEqual(await r.listBlocks({}, { player }, "newest", 10), []);
        assert.equal(await r.countBlocks({}, { player }), 0);
      }
    });
  });

  describe("library repo: order, limit, count", () => {
    const order = async (o: BlockOrder, limit = 100) => (await (await repo()).listBlocks(all, {}, o, limit)).map((b) => b.id);
    test("least-used: seconds, then times, then id", async () => {
      assert.deepEqual(await order("least-used"), ["PA", "R", "S2", "X", "S1"]);
    });
    test("newest: created_at, then id", async () => {
      assert.deepEqual(await order("newest"), ["R", "PA", "X", "S2", "S1"]);
    });
    test("limit is respected", async () => {
      assert.deepEqual(await order("newest", 2), ["R", "PA"]);
    });
    test("countBlocks equals the unlimited list", async () => {
      const r = await repo();
      for (const [scope, filter] of [[all, {}], [{}, {}], [{ player: A }, { player: "had" }], [all, { tags: ["slow"] }]] as [Scope, BlockFilter][]) {
        assert.equal(await r.countBlocks(scope, filter), (await r.listBlocks(scope, filter, "newest", 1000)).length);
      }
    });
  });
}
