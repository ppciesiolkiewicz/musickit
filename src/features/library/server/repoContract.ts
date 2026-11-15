import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { baseFixture, PLAYER_A as A, PLAYER_B as B, PLAYER_C as C, type LibraryData } from "./fixture";
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
      assert.deepEqual(await ids({}), ["D", "PB", "S1", "S2", "Zed", "alpha"]);
    });
    test("a player also sees their own blocks, and never another player's", async () => {
      assert.deepEqual(await ids({ player: A }), ["D", "PA", "PB", "R", "S1", "S2", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B }), ["D", "PB", "R", "S1", "S2", "Zed", "alpha"]);
    });
    test("includeNotEnabled adds the app's blocks and never a private one", async () => {
      assert.deepEqual(await ids({ includeNotEnabled: true }), ["D", "PB", "S1", "S2", "X", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B, includeNotEnabled: true }), ["D", "PB", "R", "S1", "S2", "X", "Zed", "alpha"]);
    });
    test("a player's block enabled for reuse is visible to everyone", async () => {
      const r = await repo();
      for (const scope of [{}, { player: A }, { includeNotEnabled: true }, { player: B }]) assert.equal((await r.getBlock(scope, "PB"))?.id, "PB");
    });
    test("a block with two owner rows, one enabled, is listed once", async () => {
      const r = await repo();
      for (const scope of [{}, { player: A }, { player: B, includeNotEnabled: true }, all] as Scope[]) {
        const list = (await r.listBlocks(scope, {}, "newest", 100)).map((b) => b.id);
        assert.equal(list.filter((id) => id === "D").length, 1);
        assert.equal(await r.countBlocks(scope, {}), list.length);
      }
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
    test("no other player's id appears in a result", async () => {
      const r = await repo();
      const list = await r.listBlocks(all, {}, "newest", 100);
      const details = await Promise.all(list.map((b) => r.getBlock(all, b.id)));
      const text = JSON.stringify([list, details]);
      for (const other of [B, C]) assert.ok(!text.includes(other), `result contains ${other}`);
    });
    test("a summary, its mine and a detail have exactly these keys", async () => {
      const r = await repo();
      const keys = (o: object) => Object.keys(o).sort();
      const [s] = await r.listBlocks({ player: A }, {}, "newest", 1);
      assert.deepEqual(keys(s), ["area", "concepts", "id", "level", "mine", "provenance", "tags", "title", "topic", "use"]);
      assert.deepEqual(keys(s.mine!), ["ratedAt", "seconds", "stars", "times"]);
      assert.deepEqual(keys(s.use), ["rated", "seconds", "stars", "times"]);
      assert.deepEqual(keys(s.provenance), ["docsAgents", "docsTeaching", "model", "promptVersion"]);
      const [n] = await r.listBlocks({}, {}, "newest", 1);
      assert.equal("mine" in n, false);
      const d = await r.getBlock({ player: A }, "S1");
      assert.deepEqual(keys(d!), ["area", "concepts", "content", "id", "level", "mine", "parentId", "provenance", "tags", "title", "topic", "use"]);
    });
    test("userExists", async () => {
      const r = await repo();
      assert.equal(await r.userExists(A), true);
      assert.equal(await r.userExists("d0000000-0000-4000-8000-00000000000d"), false);
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
      assert.equal(await r.countBlocks(all, {}), 9);
      assert.equal((await r.listBlocks(all, {}, "least-used", 10)).length, 9);
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
    test("one row with two slots on a block is one time with the seconds summed", async () => {
      const r = await repo();
      assert.deepEqual((await r.getBlock({ player: A }, "S2"))?.mine, { stars: 2, ratedAt: "2026-03-02T10:00:00.000Z", times: 1, seconds: 300 });
    });
    test("a non-number slot beside a valid one in the same row keeps the valid one", async () => {
      const r = await repo();
      assert.deepEqual((await r.getBlock({ player: B }, "S2"))?.mine, { stars: null, ratedAt: null, times: 1, seconds: 50 });
      const s2 = await r.getBlock({}, "S2");
      assert.equal(s2?.use.times, 2);
      assert.equal(s2?.use.seconds, 350);
    });
    test("mine is absent without a player in scope", async () => {
      const r = await repo();
      assert.equal((await r.getBlock({}, "S1"))?.mine, undefined);
      assert.ok((await r.listBlocks({}, {}, "newest", 10)).every((b) => b.mine === undefined));
    });
  });

  describe("library repo: the player's history", () => {
    test("unused is reusable and not owned", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "unused" }), ["PB", "S1", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B }, { player: "unused" }), ["S1", "S2", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: A, includeNotEnabled: true }, { player: "unused" }), ["PB", "S1", "X", "Zed", "alpha"]);
    });
    test("had is owned", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "had" }), ["D", "PA", "R", "S2"]);
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
    test("least-used: seconds, then times (alpha and Zed tie on seconds), then bytewise id", async () => {
      assert.deepEqual(await order("least-used"), ["D", "PA", "PB", "R", "X", "alpha", "Zed", "S2", "S1"]);
    });
    test("newest: created_at, then bytewise id (Zed before alpha)", async () => {
      assert.deepEqual(await order("newest"), ["Zed", "alpha", "D", "PB", "R", "PA", "X", "S2", "S1"]);
    });
    test("limit is respected", async () => {
      assert.deepEqual(await order("newest", 2), ["Zed", "alpha"]);
    });
    test("countBlocks equals the unlimited list", async () => {
      const r = await repo();
      for (const [scope, filter] of [[all, {}], [{}, {}], [{ player: A }, { player: "had" }], [all, { tags: ["slow"] }]] as [Scope, BlockFilter][]) {
        assert.equal(await r.countBlocks(scope, filter), (await r.listBlocks(scope, filter, "newest", 1000)).length);
      }
    });
  });
}
