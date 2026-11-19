import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { baseFixture, choice, curatedBlock, PLAYER_A as A, PLAYER_B as B, PLAYER_C as C, type LibraryData } from "./fixture";
import type { LibraryRepo } from "./repo";
import type { BlockFilter, BlockOrder, PlanFilter, Scope } from "./types";
import type { Block } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";

/** What every `LibraryRepo` must do, run against `make(data)`: the memory repo now, Postgres later. */
export function libraryRepoContract(make: (data: LibraryData) => Promise<LibraryRepo>): void {
  const repo = () => make(baseFixture());
  const ids = async (scope: Scope, filter: BlockFilter = {}, order: BlockOrder = "newest") =>
    (await (await repo()).listBlocks(scope, filter, order, 100)).map((b) => b.id).sort();
  const all: Scope = { player: A, includeNotEnabled: true };
  /**
   * `d` (the base fixture by default) with M, a curated guitar block of three choices: M/one (beginner, picking:1, 4 minutes,
   * key any), M/two (intermediate, picking:2 and picking:1, 6 minutes, a tempo range) and M/off (inactive: advanced, picking:3).
   */
  const multi = (d: LibraryData = baseFixture()): LibraryData => ({
    ...d,
    blocks: [...d.blocks, curatedBlock("M", "2026-01-10T00:00:00Z", { topic: "guitar-techniques", minutes: 4, why: "Pick evenly." })],
    choices: [
      ...d.choices,
      choice("M", "one", { level: "beginner", steps: ["picking:1"], minutes: 4, moves: { key: "any" } }),
      choice("M", "two", { level: "intermediate", steps: ["picking:2", "picking:1"], minutes: 6, place: 1, moves: { bpm: { from: 80, to: 120, step: 10 } } }),
      choice("M", "off", { level: "advanced", steps: ["picking:3"], minutes: 8, place: 2, active: false }),
    ],
    owners: [...d.owners, { userId: null, blockId: "M", source: "seed", createdAt: new Date("2026-01-01T00:00:00Z") }],
  });

  describe("library repo: visibility", () => {
    test("no scope sees only curated blocks with an active choice", async () => {
      assert.deepEqual(await ids({}), ["S1", "S2", "Zed", "alpha"]);
    });
    test("a player also sees their own blocks, and never another player's", async () => {
      assert.deepEqual(await ids({ player: A }), ["D", "PA", "R", "S1", "S2", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B }), ["D", "PB", "R", "S1", "S2", "Zed", "alpha"]);
    });
    test("includeNotEnabled adds the app's hashed blocks and never a private one", async () => {
      assert.deepEqual(await ids({ includeNotEnabled: true }), ["S1", "S2", "X", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B, includeNotEnabled: true }), ["D", "PB", "R", "S1", "S2", "X", "Zed", "alpha"]);
    });
    test("a hashed block another player owns is not visible", async () => {
      const r = await repo();
      assert.equal((await r.getBlock({ player: B }, "PB"))?.id, "PB");
      for (const scope of [{}, { player: A }, { includeNotEnabled: true }, all] as Scope[]) {
        assert.equal(await r.getBlock(scope, "PB"), null);
        assert.ok(!(await r.listBlocks(scope, {}, "newest", 100)).some((b) => b.id === "PB"));
        assert.ok(!(await r.listBlocks(scope, { level: "advanced" }, "newest", 100)).some((b) => b.id === "PB"));
      }
      assert.ok(!(await r.coverage({ player: A })).topics.some((t) => t.topic === "theory-basics" && t.level === "advanced"));
    });
    test("a curated block with no active choice is seen only with includeNotEnabled, with its inactive choices", async () => {
      const d = baseFixture();
      d.blocks.push(curatedBlock("Off", "2026-01-09T00:00:00Z", { minutes: 5 }));
      d.owners.push({ userId: null, blockId: "Off", source: "seed", createdAt: new Date("2026-01-01T00:00:00Z") });
      d.choices.push(choice("Off", "beginner", { level: "beginner", steps: ["picking:1"], active: false }));
      const r = await make(d);
      for (const scope of [{}, { player: A }] as Scope[]) {
        assert.equal(await r.getBlock(scope, "Off"), null);
        assert.equal(await r.countBlocks(scope, { steps: ["picking:1"] }), 0);
      }
      const off = await r.getBlock({ includeNotEnabled: true }, "Off");
      assert.deepEqual(off?.choices, [{ id: "Off/beginner", name: "beginner", level: "beginner", steps: ["picking:1"], moves: null, minutes: 5, active: false }]);
      assert.deepEqual([off?.level, off?.steps], ["beginner", ["picking:1"]]);
    });
    test("a block with two owner rows is listed once", async () => {
      const r = await repo();
      for (const scope of [{ player: A }, { player: B }, { player: B, includeNotEnabled: true }, all] as Scope[]) {
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
    test("getBlock returns the slot a block was stored with, and null for a block stored without one", async () => {
      const r = await repo();
      assert.deepEqual((await r.getBlock(all, "S1"))?.slot, { minutes: 5, why: "Warm the hand up.", learnBefore: ["/course/3/x"], exploreMore: ["/course/4/y"] });
      assert.deepEqual((await r.getBlock(all, "S2"))?.slot, { minutes: 7 });
      assert.equal((await r.getBlock(all, "X"))?.slot, null);
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
      assert.deepEqual(keys(s), ["area", "choices", "concepts", "id", "level", "mine", "provenance", "steps", "tags", "title", "topic", "use"]);
      assert.deepEqual(keys(s.mine!), ["ratedAt", "seconds", "stars", "times"]);
      assert.deepEqual(keys(s.use), ["rated", "seconds", "stars", "times"]);
      assert.deepEqual(keys(s.provenance), ["docsAgents", "docsTeaching", "model", "promptVersion"]);
      const [n] = await r.listBlocks({}, {}, "newest", 1);
      assert.equal("mine" in n, false);
      const d = await r.getBlock({ player: A }, "S1");
      assert.deepEqual(keys(d!), ["area", "choices", "concepts", "content", "id", "level", "mine", "parentId", "provenance", "slot", "steps", "tags", "title", "topic", "use"]);
      assert.deepEqual(keys(d!.choices[0]), ["active", "id", "level", "minutes", "moves", "name", "steps"]);
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
    test("steps match a block with any of them", async () => {
      assert.deepEqual(await ids(all, { steps: ["pentatonic:1", "nope:1"] }), ["S1"]);
      assert.deepEqual(await ids(all, { steps: ["pentatonic:2"] }), ["S1", "S2"]);
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
      assert.deepEqual(s1.steps, ["pentatonic:1", "pentatonic:2"]);
      assert.deepEqual(s1.tags, ["warmup", "slow"]);
      assert.deepEqual(s1.provenance, { model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 });
      const moves = { bpm: { from: 60, to: 90, step: 5 } };
      assert.deepEqual(s1.choices, [{ id: "S1/beginner", name: "beginner", level: "beginner", steps: ["pentatonic:1", "pentatonic:2"], moves, minutes: 5, active: true }]);
      assert.deepEqual((await (await repo()).getBlock(all, "R"))?.choices, []);
    });
    test("getBlock returns each choice's moves, null when it has none", async () => {
      const r = await repo();
      assert.deepEqual((await r.getBlock({}, "S1"))?.choices.map((c) => c.moves), [{ bpm: { from: 60, to: 90, step: 5 } }]);
      assert.deepEqual((await r.getBlock({}, "S2"))?.choices.map((c) => c.moves), [null]);
    });
    test("a curated block shows its active choices by place; its steps are theirs together, its level the first one's", async () => {
      const r = await make(multi());
      const m = (await r.getBlock({}, "M"))!;
      assert.deepEqual(m.choices.map((c) => [c.id, c.level, c.steps, c.minutes, c.active]), [
        ["M/one", "beginner", ["picking:1"], 4, true],
        ["M/two", "intermediate", ["picking:2", "picking:1"], 6, true],
      ]);
      assert.deepEqual([m.level, m.steps], ["beginner", ["picking:1", "picking:2"]]);
      assert.deepEqual((await r.getBlock({ includeNotEnabled: true }, "M"))?.choices.map((c) => [c.id, c.active]), [["M/one", true], ["M/two", true], ["M/off", false]]);
    });
    test("level and steps find a curated block through any of its active choices, never an inactive one", async () => {
      const r = await make(multi());
      const found = async (scope: Scope, f: BlockFilter) => (await r.listBlocks(scope, f, "newest", 100)).map((b) => b.id).filter((id) => id === "M");
      assert.deepEqual(await found({}, { level: "intermediate" }), ["M"]);
      assert.deepEqual(await found({}, { steps: ["picking:2"] }), ["M"]);
      assert.deepEqual(await found({}, { steps: ["picking:3"] }), []);
      assert.deepEqual(await found({}, { level: "advanced" }), []);
      assert.deepEqual(await found({ includeNotEnabled: true }, { steps: ["picking:3"] }), ["M"]);
      assert.equal(await r.countBlocks({}, { steps: ["picking:1"] }), 1);
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
      assert.equal(await r.countBlocks(all, {}), 8);
      assert.equal((await r.listBlocks(all, {}, "least-used", 10)).length, 8);
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

  describe("library repo: odd rows", () => {
    /** A rating of `blockId` by `userId`; `at` left out when undefined. */
    const rating = (userId: string, exerciseId: string, blockId: string, stars: number, at?: string): LibraryData["progress"][number] => ({
      userId, exerciseId, blockId, choiceId: blockId === "S2" ? "S2/intermediate" : null,
      entry: { id: `${userId}-${exerciseId}`, planId: "p-1", exerciseId, day: 0, exercise: 0, title: "t", blockId, stars, ...(at !== undefined ? { at } : {}) } as unknown as ProgressEntry,
    });
    test("a rating without a date is older than any dated one", async () => {
      const d = baseFixture();
      // e-r0 sorts before A's dated e-r1 and e-r2, so it would win if undated came first or ties went by exercise id alone
      const r = await make({ ...d, progress: [rating(A, "e-r0", "R", 1), ...d.progress] });
      const rr = await r.getBlock({ player: A }, "R");
      assert.deepEqual([rr?.mine?.stars, rr?.mine?.ratedAt], [5, "2026-03-05T10:00:00.000Z"]);
    });
    test("composeBlocks: a rating without a date gives ratedAt \"\", and a dated one wins over it", async () => {
      const d = baseFixture();
      const undated = await make({ ...d, progress: [...d.progress, rating(C, "e-u0", "S2", 2)] });
      assert.deepEqual((await undated.composeBlocks(C, ["guitar"])).find((b) => b.id === "S2")?.mine, { stars: 2, ratedAt: "" });
      const both = await make({ ...d, progress: [...d.progress, rating(C, "e-u0", "S2", 2), rating(C, "e-u1", "S2", 4, "2026-03-01T10:00:00.000Z")] });
      assert.deepEqual((await both.composeBlocks(C, ["guitar"])).find((b) => b.id === "S2")?.mine, { stars: 4, ratedAt: "2026-03-01T10:00:00.000Z" });
    });
    test("two ratings at the same time: the lower exercise id is the latest", async () => {
      const d = baseFixture();
      const at = "2026-03-09T10:00:00.000Z";
      const r = await make({ ...d, progress: [...d.progress, rating(B, "e-t2", "S2", 4, at), rating(B, "e-t1", "S2", 2, at)] });
      assert.deepEqual((await r.getBlock({ player: B }, "S2"))?.mine?.stars, 2);
    });
    test("a timer slot mapped to a number names no block, even one whose id is that number's text", async () => {
      const d = baseFixture();
      const seven = { ...d.blocks[0], id: "7", kind: "hashed" as const };
      const r = await make({
        ...d,
        blocks: [...d.blocks, seven],
        owners: [...d.owners, { userId: A, blockId: "7", source: "ai", createdAt: new Date("2026-01-01T00:00:00Z") }],
        dayTimes: [...d.dayTimes, { userId: A, planId: "p-n", day: 0, elapsed: 100, spent: { e1: 100 }, blocks: { e1: 7 } }],
      });
      const b = await r.getBlock({ player: A }, "7");
      assert.deepEqual([b?.use.times, b?.use.seconds, b?.mine?.times, b?.mine?.seconds], [0, 0, 0, 0]);
    });
    test("a block whose content has no title has the title \"\"", async () => {
      const d = baseFixture();
      const r = await make({ ...d, blocks: d.blocks.map((b) => (b.id === "S1" ? { ...b, content: { cells: [] } as unknown as Block } : b)) });
      assert.equal((await r.getBlock({}, "S1"))?.title, "");
      assert.equal((await r.listBlocks({}, { level: "beginner" }, "newest", 10)).find((b) => b.id === "S1")?.title, "");
      assert.equal((await r.getPlan({}, "P1", false))?.schedule[0].title, "");
    });
  });

  describe("library repo: the player's history", () => {
    test("unused is reusable and not owned", async () => {
      assert.deepEqual(await ids({ player: A }, { player: "unused" }), ["S1", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: B }, { player: "unused" }), ["S1", "S2", "Zed", "alpha"]);
      assert.deepEqual(await ids({ player: A, includeNotEnabled: true }, { player: "unused" }), ["S1", "X", "Zed", "alpha"]);
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
      assert.deepEqual(await order("least-used"), ["D", "PA", "R", "X", "alpha", "Zed", "S2", "S1"]);
    });
    test("newest: created_at, then bytewise id (Zed before alpha)", async () => {
      assert.deepEqual(await order("newest"), ["Zed", "alpha", "D", "R", "PA", "X", "S2", "S1"]);
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

  describe("library repo: plans", () => {
    const planIds = async (scope: Scope, filter: PlanFilter = {}, tweak: (d: LibraryData) => LibraryData = (d) => d) =>
      (await (await make(tweak(baseFixture()))).listPlans(scope, filter, 100)).map((p) => p.id);
    const keys = (o: object) => Object.keys(o).sort();

    test("a plan is listed when enabled, and the not enabled one only with includeNotEnabled, by id", async () => {
      assert.deepEqual(await planIds({}), ["P1", "P2", "P4"]);
      assert.deepEqual(await planIds({ player: A }), ["P1", "P2", "P4"]);
      assert.deepEqual(await planIds({ includeNotEnabled: true }), ["P1", "P2", "P3", "P4"]);
      const r = await repo();
      assert.equal(await r.getPlan({}, "P3", false), null);
      assert.equal((await r.getPlan({ includeNotEnabled: true }, "P3", false))?.id, "P3");
      assert.equal(await r.getPlan(all, "nope", false), null);
    });
    test("plan ids order bytewise and the limit is respected", async () => {
      const tweak = (d: LibraryData): LibraryData => ({ ...d, plans: [...d.plans, { ...d.plans[0], id: "alpha-plan" }, { ...d.plans[0], id: "Zed-plan" }] });
      assert.deepEqual(await planIds(all, {}, tweak), ["P1", "P2", "P3", "P4", "Zed-plan", "alpha-plan"]);
      assert.deepEqual((await (await repo()).listPlans(all, {}, 2)).map((p) => p.id), ["P1", "P2"]);
    });
    test("scope.planIds narrows the list and getPlan, even with includeNotEnabled", async () => {
      assert.deepEqual(await planIds({ planIds: ["P2", "P3"] }), ["P2"]);
      assert.deepEqual(await planIds({ planIds: ["P2", "P3"], includeNotEnabled: true }), ["P2", "P3"]);
      assert.deepEqual(await planIds({ planIds: [], includeNotEnabled: true }), []);
      const r = await repo();
      assert.equal(await r.getPlan({ planIds: ["P2"], includeNotEnabled: true }, "P1", false), null);
      assert.equal((await r.getPlan({ planIds: ["P2"], includeNotEnabled: true }, "P2", false))?.id, "P2");
    });
    test("filters", async () => {
      assert.deepEqual(await planIds(all, { areas: ["rhythm"] }), ["P2"]);
      assert.deepEqual(await planIds(all, { areas: ["ear", "theory"] }), ["P1", "P3"]);
      assert.deepEqual(await planIds(all, { levels: ["beginner"] }), ["P1", "P2", "P3"]);
      assert.deepEqual(await planIds(all, { levels: ["advanced"] }), []);
      assert.deepEqual(await planIds(all, { levels: ["intermediate"] }), ["P1", "P2"]);
      assert.deepEqual(await planIds(all, { levels: ["intermediate", "advanced"] }), ["P1", "P2"]);
      assert.deepEqual(await planIds(all, { levels: ["advanced", "beginner"] }), ["P1", "P2", "P3"]);
      assert.deepEqual(await planIds(all, { topics: ["guitar-scales", "ear"] }), ["P1"]);
      assert.deepEqual(await planIds(all, { topics: ["rhythm"] }), ["P2"]);
      assert.deepEqual(await planIds(all, { model: "m1" }), ["P1", "P3"]);
      assert.deepEqual(await planIds(all, { promptVersion: 4 }), ["P2"]);
      assert.deepEqual(await planIds(all, { docsAgents: 2 }), ["P1", "P2"]);
      assert.deepEqual(await planIds(all, { docsTeaching: 3 }), ["P2"]);
      assert.deepEqual(await planIds(all, { levels: ["beginner"], topics: ["ear"], model: "m1" }), ["P1", "P3"]);
    });
    test("a plan row's level and steps are its choice's", async () => {
      const tweak = (d: LibraryData): LibraryData => ({ ...multi(d), planBlocks: [...d.planBlocks, { planId: "P4", day: 0, place: 0, blockId: "M", choiceId: "M/two", minutes: 6 }] });
      assert.deepEqual(await planIds(all, { levels: ["intermediate"] }, tweak), ["P1", "P2", "P4"]);
      assert.deepEqual(await planIds(all, { levels: ["beginner"] }, tweak), ["P1", "P2", "P3"]);
    });
    test("a plan filter sees the plan's blocks even when a block is not visible to the caller", async () => {
      assert.deepEqual(await planIds({}, { topics: ["ear"] }), ["P1"]);
    });
    test("days, minutes, blocks, topics and concepts come from the plan's block rows", async () => {
      const p1 = (await (await repo()).getPlan({}, "P1", false))!;
      assert.deepEqual([p1.id, p1.title, p1.days, p1.minutes, p1.blocks], ["P1", "Plan P1", 2, 40, 3]);
      assert.deepEqual(p1.answers, { areas: ["guitar", "theory"] });
      assert.deepEqual(p1.provenance, { model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 });
      assert.deepEqual(p1.topics, [{ id: "guitar-scales", count: 2 }, { id: "ear", count: 1 }]);
      assert.deepEqual(p1.concepts, [{ id: "pentatonic", count: 2 }, { id: "intervals", count: 1 }, { id: "major-scale", count: 1 }]);
      const p2 = (await (await repo()).getPlan({}, "P2", false))!;
      assert.deepEqual([p2.days, p2.minutes, p2.blocks], [1, 30, 2]);
      assert.deepEqual(p2.topics, [{ id: "rhythm", count: 1 }, { id: "theory-basics", count: 1 }]);
      assert.deepEqual(p2.concepts, []);
    });
    test("hadShare is the owned share of the plan's blocks for the player, null without one", async () => {
      const r = await repo();
      const share = async (scope: Scope, id: string) => (await r.getPlan(scope, id, false))?.hadShare;
      assert.ok(Math.abs((await share({ player: A }, "P1"))! - 1 / 3) < 1e-9);
      assert.equal(await share({ player: A }, "P2"), 1);
      assert.equal(await share({ player: C }, "P2"), 0);
      assert.equal(await share({}, "P1"), null);
      assert.equal((await r.listPlans({}, {}, 10)).every((p) => p.hadShare === null), true);
      assert.deepEqual((await r.listPlans({ player: C }, {}, 10)).map((p) => p.hadShare), [0, 0, 0]);
    });
    test("a plan with no block rows lists with zeros and an empty schedule", async () => {
      const r = await repo();
      const p4 = (await r.listPlans({ player: A }, {}, 10)).find((p) => p.id === "P4")!;
      assert.deepEqual([p4.days, p4.minutes, p4.blocks, p4.hadShare], [0, 0, 0, 0]);
      assert.deepEqual([p4.topics, p4.concepts], [[], []]);
      assert.equal(p4.answers, null);
      assert.deepEqual((await r.getPlan({ player: A }, "P4", false))?.schedule, []);
    });
    test("the schedule is by day and place, with the block titles, and the reply only when asked", async () => {
      const r = await repo();
      const p1 = (await r.getPlan({ includeNotEnabled: true }, "P1", false))!;
      assert.deepEqual(p1.schedule, [
        { day: 0, place: 0, blockId: "S1", title: "Block S1", minutes: 10 },
        { day: 0, place: 1, blockId: "S2", title: "Block S2", minutes: 15 },
        { day: 1, place: 0, blockId: "S1", title: "Block S1", minutes: 10 },
        { day: 1, place: 1, blockId: "X", title: "Block X", minutes: 5 },
      ]);
      assert.equal("reply" in p1, false);
      assert.equal((await r.getPlan({}, "P1", true))?.reply, "reply P1");
      // X is the app's and not enabled: without includeNotEnabled its row stays, without its title
      assert.deepEqual((await r.getPlan({}, "P1", false))?.schedule[3], { day: 1, place: 1, blockId: "X", title: "", minutes: 5 });
    });
    test("a schedule row on a block the caller cannot see has the title \"\"; ids, minutes and counts stay", async () => {
      // P4 holds PA, A's private block
      const d = baseFixture();
      const r = await make({ ...d, planBlocks: [...d.planBlocks, { planId: "P4", day: 0, place: 0, blockId: "PA", minutes: 5 }] });
      for (const scope of [{}, { player: B }] as Scope[]) {
        const p4 = (await r.getPlan(scope, "P4", false))!;
        assert.deepEqual(p4.schedule, [{ day: 0, place: 0, blockId: "PA", title: "", minutes: 5 }]);
        assert.deepEqual([p4.days, p4.minutes, p4.blocks], [1, 5, 1]);
      }
      assert.deepEqual((await r.getPlan({ player: A }, "P4", false))?.schedule, [{ day: 0, place: 0, blockId: "PA", title: "Block PA", minutes: 5 }]);
    });
    test("no other player's id appears in a plan result", async () => {
      const r = await repo();
      const list = await r.listPlans(all, {}, 100);
      const details = await Promise.all(list.map((p) => r.getPlan(all, p.id, true)));
      const text = JSON.stringify([list, details]);
      for (const other of [B, C]) assert.ok(!text.includes(other), `result contains ${other}`);
    });
    test("a plan summary, a detail and a schedule row have exactly these keys", async () => {
      const r = await repo();
      const [s] = await r.listPlans(all, {}, 1);
      assert.deepEqual(keys(s), ["answers", "blocks", "concepts", "days", "hadShare", "id", "minutes", "provenance", "title", "topics"]);
      assert.deepEqual(keys(s.provenance), ["docsAgents", "docsTeaching", "model", "promptVersion"]);
      assert.deepEqual(keys(s.topics[0]), ["count", "id"]);
      const d = (await r.getPlan(all, "P1", true))!;
      assert.deepEqual(keys(d), [...keys(s), "reply", "schedule"].sort());
      assert.deepEqual(keys(d.schedule[0]), ["blockId", "day", "minutes", "place", "title"]);
    });
  });

  describe("library repo: coverage", () => {
    test("counts visible blocks and plans per topic and level, and leaves out blocks that are not visible", async () => {
      const c = await (await repo()).coverage({});
      assert.deepEqual(c.topics, [
        { topic: "guitar-scales", level: "beginner", blocks: 1, plans: 1, times: 2, seconds: 900 },
        { topic: "guitar-scales", level: "intermediate", blocks: 1, plans: 1, times: 2, seconds: 350 },
        { topic: "naming", level: "advanced", blocks: 2, plans: 0, times: 3, seconds: 600 },
      ]);
      assert.deepEqual(c.concepts, [
        { concept: "major-scale", blocks: 1, plans: 1, times: 2, seconds: 900 },
        { concept: "pentatonic", blocks: 2, plans: 1, times: 4, seconds: 1250 },
      ]);
      assert.deepEqual(c.steps, [
        { step: "pentatonic:1", blocks: 1, plans: 1, times: 2, seconds: 900 },
        { step: "pentatonic:2", blocks: 2, plans: 1, times: 4, seconds: 1250 },
      ]);
    });
    test("includeNotEnabled and the player's own blocks add blocks and plans", async () => {
      const c = await (await repo()).coverage(all);
      assert.deepEqual(c.topics, [
        { topic: "ear", level: "beginner", blocks: 1, plans: 2, times: 0, seconds: 0 },
        { topic: "guitar-scales", level: "beginner", blocks: 2, plans: 1, times: 2, seconds: 900 },
        { topic: "guitar-scales", level: "intermediate", blocks: 1, plans: 1, times: 2, seconds: 350 },
        { topic: "naming", level: "advanced", blocks: 2, plans: 0, times: 3, seconds: 600 },
        { topic: "rhythm", level: "beginner", blocks: 1, plans: 1, times: 0, seconds: 0 },
        { topic: "theory-basics", level: "intermediate", blocks: 1, plans: 1, times: 0, seconds: 0 },
      ]);
      assert.deepEqual(c.concepts, [
        { concept: "intervals", blocks: 1, plans: 2, times: 0, seconds: 0 },
        { concept: "major-scale", blocks: 1, plans: 1, times: 2, seconds: 900 },
        { concept: "pentatonic", blocks: 2, plans: 1, times: 4, seconds: 1250 },
      ]);
    });
    const gsBeginner = (c: Awaited<ReturnType<LibraryRepo["coverage"]>>) => c.topics.find((t) => t.topic === "guitar-scales" && t.level === "beginner");
    const withRows = (rows: LibraryData["planBlocks"]) => (d: LibraryData): LibraryData => ({ ...d, planBlocks: [...d.planBlocks, ...rows] });
    test("a plan that is not enabled counts only with includeNotEnabled", async () => {
      const r = await make(withRows([{ planId: "P3", day: 1, place: 0, blockId: "S1", choiceId: "S1/beginner", minutes: 5 }])(baseFixture()));
      assert.equal(gsBeginner(await r.coverage({}))?.plans, 1);
      assert.equal(gsBeginner(await r.coverage({ includeNotEnabled: true }))?.plans, 2);
    });
    test("a plan outside scope.planIds does not count", async () => {
      const r = await make(baseFixture());
      assert.equal(gsBeginner(await r.coverage({}))?.plans, 1);
      assert.equal(gsBeginner(await r.coverage({ planIds: ["P2"] }))?.plans, 0);
      assert.equal(gsBeginner(await r.coverage({ planIds: ["P1"] }))?.plans, 1);
    });
    test("a plan counts through its own block rows, even when its block of that pair is not visible to the caller", async () => {
      // P4 holds PA (A's private block): the pair is listed for {} through S1, and P4 counts although {} cannot see PA
      const r = await make(withRows([{ planId: "P4", day: 0, place: 0, blockId: "PA", minutes: 5 }])(baseFixture()));
      const row = gsBeginner(await r.coverage({}));
      assert.deepEqual([row?.blocks, row?.plans], [1, 2]);
      // a pair whose only blocks are invisible has no row, whatever plans hold them
      assert.equal((await r.coverage({})).topics.some((t) => t.topic === "ear"), false);
    });
    test("the seconds of a pair are the block totals of its visible blocks", async () => {
      const r = await repo();
      const c = await r.coverage(all);
      const blocks = await r.listBlocks(all, {}, "newest", 100);
      for (const row of c.topics) {
        const own = blocks.filter((b) => b.topic === row.topic && b.level === row.level);
        assert.equal(row.seconds, own.reduce((n, b) => n + b.use.seconds, 0));
        assert.equal(row.times, own.reduce((n, b) => n + b.use.times, 0));
        assert.equal(row.blocks, own.length);
      }
    });
    test("scope.planIds narrows the plans counted, not the blocks", async () => {
      const c = await (await repo()).coverage({ ...all, planIds: ["P2"] });
      assert.equal(c.topics.find((t) => t.topic === "guitar-scales" && t.level === "beginner")?.plans, 0);
      assert.equal(c.topics.find((t) => t.topic === "guitar-scales" && t.level === "beginner")?.blocks, 2);
      assert.equal(c.topics.find((t) => t.topic === "rhythm")?.plans, 1);
    });
    test("coverage counts a step once per choice, and a block's time once", async () => {
      const d = multi();
      d.planBlocks.push({ planId: "P4", day: 0, place: 0, blockId: "M", choiceId: "M/one", minutes: 4 });
      d.dayTimes.push({ userId: A, planId: "p-m", day: 0, elapsed: 120, spent: { e1: 120 }, blocks: { e1: "M" } });
      const r = await make(d);
      const c = await r.coverage({});
      // M/one and M/two both name picking:1; M/off (inactive) names picking:3
      assert.deepEqual(c.steps.filter((s) => s.step.startsWith("picking:")), [
        { step: "picking:1", blocks: 2, plans: 1, times: 1, seconds: 120 },
        { step: "picking:2", blocks: 1, plans: 0, times: 1, seconds: 120 },
      ]);
      assert.deepEqual(c.topics.filter((t) => t.topic === "guitar-techniques"), [
        { topic: "guitar-techniques", level: "beginner", blocks: 1, plans: 1, times: 1, seconds: 120 },
        { topic: "guitar-techniques", level: "intermediate", blocks: 1, plans: 0, times: 1, seconds: 120 },
      ]);
      const dev = await r.coverage({ includeNotEnabled: true });
      assert.deepEqual(dev.steps.find((s) => s.step === "picking:3"), { step: "picking:3", blocks: 1, plans: 0, times: 1, seconds: 120 });
    });
    test("an empty library has no plans, no coverage and no blocks", async () => {
      const r = await make({ users: [], blocks: [], choices: [], owners: [], progress: [], dayTimes: [], plans: [], planBlocks: [] });
      assert.deepEqual(await r.listPlans(all, {}, 10), []);
      assert.equal(await r.getPlan(all, "P1", true), null);
      assert.deepEqual(await r.coverage(all), { topics: [], concepts: [], steps: [] });
      assert.deepEqual(await r.listBlocks(all, {}, "newest", 10), []);
      assert.equal(await r.countBlocks(all, {}), 0);
    });
  });

  describe("library repo: composeBlocks", () => {
    const slotted = (id: string, extra: Partial<LibraryData["blocks"][number]> = {}): LibraryData["blocks"][number] => ({
      ...baseFixture().blocks[0], id, content: { title: `Block ${id}`, cells: [] }, ...extra,
    });
    const seed = (d: LibraryData, id: string, extra: Partial<LibraryData["blocks"][number]>, choices: Partial<LibraryData["choices"][number]>[]) => {
      d.blocks.push(slotted(id, extra));
      d.owners.push({ userId: null, blockId: id, source: "seed", createdAt: new Date("2026-01-01T00:00:00Z") });
      choices.forEach((c, place) => d.choices.push(choice(id, c.name ?? `c${place}`, { level: "beginner", steps: ["picking:1"], place, ...c })));
    };
    const rated = (userId: string, exerciseId: string, blockId: string, choiceId: string | null, stars: number, at: string): LibraryData["progress"][number] => ({
      userId, exerciseId, blockId, choiceId,
      entry: { id: `${userId}-${exerciseId}`, planId: "p-1", exerciseId, day: 0, exercise: 0, title: "t", blockId, stars, at } as unknown as ProgressEntry,
    });
    const composeIds = async (d: LibraryData, areas: string[], player = A) => (await (await make(d)).composeBlocks(player, areas)).map((b) => b.choiceId);

    test("returns the active choices of curated blocks in the given areas that name a step", async () => {
      const d = baseFixture();
      seed(d, "NoSteps", {}, [{ steps: [] }]);
      seed(d, "Ear", { area: "ear" }, [{}]);
      // a hashed block the app owns, with steps and a slot, and a hashed block a player owns: never composed
      d.blocks.push(slotted("Hashed", { kind: "hashed", level: "beginner", steps: ["picking:1"] }), slotted("Theirs", { kind: "hashed", level: "beginner", steps: ["picking:1"] }));
      d.owners.push({ userId: null, blockId: "Hashed", source: "example", createdAt: new Date("2026-01-01T00:00:00Z") }, { userId: B, blockId: "Theirs", source: "ai", createdAt: new Date("2026-01-01T00:00:00Z") });
      assert.deepEqual(await composeIds(d, ["guitar"]), ["S1/beginner", "S2/intermediate"]);
      assert.deepEqual(await composeIds(d, ["guitar"], B), ["S1/beginner", "S2/intermediate"]);
      assert.deepEqual(await composeIds(d, ["ear", "guitar"]), ["Ear/c0", "S1/beginner", "S2/intermediate"]);
      assert.deepEqual(await composeIds(d, ["ear"]), ["Ear/c0"]);
      assert.deepEqual(await composeIds(d, []), []);
      assert.deepEqual(await composeIds(d, ["nope"]), []);
    });
    test("composeBlocks gives one item per active choice", async () => {
      const list = (await (await make(multi())).composeBlocks(A, ["guitar"])).filter((b) => b.id === "M");
      assert.deepEqual(list.map((b) => [b.choiceId, b.level, b.steps, b.slot.minutes]), [
        ["M/one", "beginner", ["picking:1"], 4],
        ["M/two", "intermediate", ["picking:2", "picking:1"], 6],
      ]);
      assert.deepEqual(list.map((b) => b.content.moves), [{ key: "any" }, { bpm: { from: 80, to: 120, step: 10 } }]);
      assert.deepEqual(list.map((b) => [b.topic, b.slot.why]), [["guitar-techniques", "Pick evenly."], ["guitar-techniques", "Pick evenly."]]);
    });
    test("an inactive choice is never composed", async () => {
      const d = multi();
      d.choices = d.choices.map((c) => (c.id === "M/one" ? { ...c, active: false } : c));
      assert.deepEqual((await composeIds(d, ["guitar"])).filter((id) => id.startsWith("M/")), ["M/two"]);
      d.choices = d.choices.map((c) => (c.blockId === "M" ? { ...c, active: false } : c));
      assert.deepEqual((await composeIds(d, ["guitar"])).filter((id) => id.startsWith("M/")), []);
    });
    test("a choice has its block's content, fields and slot", async () => {
      const [s1] = await (await repo()).composeBlocks(A, ["guitar"]);
      assert.equal(s1.id, "S1");
      assert.equal(s1.choiceId, "S1/beginner");
      assert.deepEqual(s1.content, { title: "Block S1", cells: [], moves: { bpm: { from: 60, to: 90, step: 5 } } });
      assert.deepEqual([s1.area, s1.topic, s1.level], ["guitar", "guitar-scales", "beginner"]);
      assert.deepEqual(s1.concepts, ["major-scale", "pentatonic"]);
      assert.deepEqual(s1.steps, ["pentatonic:1", "pentatonic:2"]);
      assert.deepEqual(s1.tags, ["warmup", "slow"]);
      assert.deepEqual(s1.slot, { minutes: 5, why: "Warm the hand up.", learnBefore: ["/course/3/x"], exploreMore: ["/course/4/y"] });
      assert.deepEqual(Object.keys(s1).sort(), ["area", "choiceId", "concepts", "content", "id", "level", "mine", "slot", "steps", "tags", "topic", "use"]);
      const [, s2] = await (await repo()).composeBlocks(A, ["guitar"]);
      assert.equal("moves" in s2.content, false);
    });
    test("use counts every player's time on the block, for each of its choices", async () => {
      const list = await (await repo()).composeBlocks(A, ["guitar"]);
      // S1: A 600s and B 300s (B's bad row adds nothing); S2: A 100+200s in one row, B 50s
      assert.deepEqual(list.map((b) => b.use), [{ times: 2, seconds: 900 }, { times: 2, seconds: 350 }]);
      const other = await (await repo()).composeBlocks(C, ["guitar"]);
      assert.deepEqual(other.map((b) => b.use), [{ times: 2, seconds: 900 }, { times: 2, seconds: 350 }]);
      const d = multi();
      d.dayTimes.push({ userId: B, planId: "p-m", day: 0, elapsed: 90, spent: { e1: 90 }, blocks: { e1: "M" } });
      const m = (await (await make(d)).composeBlocks(A, ["guitar"])).filter((b) => b.id === "M");
      assert.deepEqual(m.map((b) => b.use), [{ times: 1, seconds: 90 }, { times: 1, seconds: 90 }]);
    });
    test("mine is the player's newest rating by at, and null for a choice they never rated", async () => {
      const d = baseFixture();
      d.progress.push(
        rated(A, "e-s2-late", "S2", "S2/intermediate", 4, "2026-03-09T10:00:00.000Z"), rated(A, "e-s2-early", "S2", "S2/intermediate", 1, "2026-03-01T10:00:00.000Z"),
        rated(B, "e-s2-b", "S2", "S2/intermediate", 5, "2026-03-20T10:00:00.000Z"),
      );
      const r = await make(d);
      const a = await r.composeBlocks(A, ["guitar"]);
      assert.equal(a.find((b) => b.id === "S1")?.mine, null);
      assert.deepEqual(a.find((b) => b.id === "S2")?.mine, { stars: 4, ratedAt: "2026-03-09T10:00:00.000Z" });
      const b = await r.composeBlocks(B, ["guitar"]);
      assert.deepEqual(b.find((x) => x.id === "S2")?.mine, { stars: 5, ratedAt: "2026-03-20T10:00:00.000Z" });
      assert.equal((await r.composeBlocks(C, ["guitar"])).find((x) => x.id === "S2")?.mine, null);
    });
    test("mine follows the choice id", async () => {
      const d = multi();
      d.progress.push(
        rated(A, "e-m1", "M", "M/one", 2, "2026-03-01T10:00:00.000Z"),
        // a later rating of the block with no choice (a hashed copy's row, or one from before choices) is no choice's
        rated(A, "e-m0", "M", null, 5, "2026-03-09T10:00:00.000Z"),
        rated(A, "e-m2", "M", "M/two", 3, "2026-03-05T10:00:00.000Z"),
      );
      const m = (await (await make(d)).composeBlocks(A, ["guitar"])).filter((b) => b.id === "M");
      assert.deepEqual(m.map((b) => [b.choiceId, b.mine]), [
        ["M/one", { stars: 2, ratedAt: "2026-03-01T10:00:00.000Z" }],
        ["M/two", { stars: 3, ratedAt: "2026-03-05T10:00:00.000Z" }],
      ]);
      // the block's own mine (get_block) is still the newest of all its rows
      assert.deepEqual((await (await make(d)).getBlock({ player: A }, "M"))?.mine?.stars, 5);
    });
    test("a reseeded text edit keeps mine", async () => {
      const d = multi();
      d.progress.push(rated(A, "e-m1", "M", "M/one", 2, "2026-03-01T10:00:00.000Z"));
      d.blocks = d.blocks.map((b) => (b.id === "M" ? { ...b, content: { title: "Down-up picking, fixed", cells: [] } } : b));
      const [one] = (await (await make(d)).composeBlocks(A, ["guitar"])).filter((b) => b.id === "M");
      assert.equal(one.content.title, "Down-up picking, fixed");
      assert.deepEqual(one.mine, { stars: 2, ratedAt: "2026-03-01T10:00:00.000Z" });
      assert.deepEqual((await (await make(d)).getBlock({ player: A }, "M"))?.mine?.stars, 2);
    });
  });
}
