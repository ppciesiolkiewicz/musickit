import assert from "node:assert/strict";
import test from "node:test";
import { TOPICS } from "@/features/plan/intake/topics";
import { CONCEPTS } from "@/features/plan/model/concepts";
import type { ProgressEntry } from "@/features/progress/log";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { PLAYER_A, PLAYER_B, baseFixture } from "./fixture";
import { findBlocks, findPlans, getBlock, getPlan, libraryCoverage, playerProgress, type Deps } from "./query";
import { memoryLibraryRepo } from "./repo.memory";

const now = new Date("2026-11-15T10:00:00Z");
const deps = (over: Partial<Deps> = {}): Deps => ({ library: memoryLibraryRepo(baseFixture()), userData: memoryUserDataRepo(), today: () => "2026-11-15", ...over });

test("limits clamp to 1..max and a missing one is the default", async () => {
  const d = deps();
  assert.ok((await findBlocks(d, { includeNotEnabled: true, player: PLAYER_A }, {}, undefined, 10000)).length <= 50);
  assert.equal((await findBlocks(d, {}, {}, undefined, 0)).length, 1);
  assert.equal((await findBlocks(d, {}, {})).length, 6);
  assert.equal((await findPlans(d, {}, {}, 0)).length, 1);
  assert.equal((await findPlans(d, {}, {}, 1000)).length, 3);
});

test("random-least-used takes from the least used fifth, and rand changes the pick", async () => {
  const scope = {};
  const least = (await findBlocks(deps(), scope, {}, "least-used", 2)).map((b) => b.id);
  const a = await findBlocks(deps({ rand: () => 0 }), scope, {}, "random-least-used", 1);
  const b = await findBlocks(deps({ rand: () => 0.99 }), scope, {}, "random-least-used", 1);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.ok(least.includes(a[0].id) && least.includes(b[0].id));
  assert.notEqual(a[0].id, b[0].id);
  // a limit above the fifth takes the limit least used
  const four = await findBlocks(deps({ rand: () => 0.3 }), scope, {}, "random-least-used", 4);
  assert.deepEqual(four.map((x) => x.id).sort(), (await findBlocks(deps(), scope, {}, "least-used", 4)).map((x) => x.id).sort());
});

test("get_block and get_plan pass through the repo's visibility", async () => {
  const d = deps();
  assert.equal(await getBlock(d, {}, "PA"), null);
  assert.equal((await getBlock(d, { player: PLAYER_A }, "PA"))?.id, "PA");
  assert.equal(await getPlan(d, {}, "P3"), null);
  assert.equal((await getPlan(d, {}, "P1", true))?.reply, "reply P1");
  assert.equal((await getPlan(d, {}, "P1"))?.reply, undefined);
});

test("coverage has a row for every topic and level and every concept, zeros included", async () => {
  const c = await libraryCoverage(deps(), {});
  assert.ok(c.topics.length >= TOPICS.length * 4);
  assert.ok(c.concepts.length >= CONCEPTS.length);
  const row = c.topics.find((r) => r.topic === TOPICS[0].id && r.level === "advanced");
  assert.deepEqual(row, { topic: TOPICS[0].id, level: "advanced", blocks: 0, plans: 0, times: 0, seconds: 0 });
  // repo rows for a topic outside the catalogue come after the catalogue's
  const last = c.topics.slice(TOPICS.length * 4);
  assert.ok(last.length > 0 && last.every((r) => !TOPICS.some((t) => t.id === r.topic)));
  assert.equal(c.topics.find((r) => r.topic === "guitar-scales" && r.level === "beginner")?.blocks, 1);
});

test("playerProgress is null without a player", async () => {
  assert.equal(await playerProgress(deps(), {}), null);
});

test("playerProgress for A: rated topic and concept are no longer not-yet, blocks are A's", async () => {
  const userData = memoryUserDataRepo();
  await userData.putDoc(PLAYER_A, "plan", { answersHistory: [{ at: "2026-11-01", topics: { "guitar-scales": 1 } }] }, now);
  await userData.putProgress(PLAYER_A, { id: "p1", planId: "p-1", exerciseId: "e1", day: 0, exercise: 0, title: "S1", area: "guitar", topic: "guitar-scales", concepts: ["pentatonic"], blockId: "S1", stars: 4, at: "2026-11-10T10:00:00Z" }, now);
  await userData.putPlanTime(PLAYER_A, { planId: "p-1", day: 0, elapsed: 600, spent: { e1: 600 }, blocks: { e1: "S1" } }, now);
  const r = await playerProgress(deps({ userData }), { player: PLAYER_A });
  assert.ok(r);
  const topic = r.outcome.areas.flatMap((a) => a.topics).find((t) => t.topic === "guitar-scales")!;
  assert.equal(topic.ratings, 1);
  assert.notEqual(topic.reached, null);
  assert.ok(topic.seconds > 0 || r.outcome.seconds.total === 600);
  assert.equal(r.outcome.areas.flatMap((a) => a.topics).flatMap((t) => t.concepts).find((c) => c.id === "pentatonic")?.state, "solid");
  assert.equal(r.outcome.asOf, "2026-11-15");
  assert.deepEqual(r.blocks.map((b) => b.id).sort(), ["D", "PA", "R", "S2"]);
  assert.equal(r.blocksTotal, 4);
  assert.ok(r.blocks.every((b) => b.mine));
  // another player's data is not read for A
  assert.equal((await playerProgress(deps({ userData }), { player: PLAYER_B }))?.outcome.areas.flatMap((a) => a.topics).find((t) => t.topic === "guitar-scales")?.ratings, 0);
});

test("playerProgress for a player with no plan document and no progress answers", async () => {
  const r = await playerProgress(deps(), { player: PLAYER_B });
  assert.ok(r);
  assert.equal(r.outcome.seconds.total, 0);
  assert.equal(r.outcome.streak.days, 0);
});

test("playerProgress caps the blocks at the max and gives the total beside them", async () => {
  const data = baseFixture();
  for (let i = 0; i < 55; i++) {
    const id = `M${String(i).padStart(2, "0")}`;
    data.blocks.push({ ...data.blocks[0], id });
    data.owners.push({ userId: PLAYER_A, blockId: id, source: "ai", enabledForReuse: false, createdAt: new Date("2026-01-01T00:00:00Z") });
  }
  const r = await playerProgress(deps({ library: memoryLibraryRepo(data) }), { player: PLAYER_A });
  assert.ok(r);
  assert.equal(r.blocks.length, 50);
  assert.equal(r.blocksTotal, 59);
});

test("playerProgress reads progress the way the player's API does: a broken stored row is ignored", async () => {
  const userData = memoryUserDataRepo();
  // stars 9 is not a rating: readEntries drops the row, as GET /api/me/progress does
  const broken = { id: "p1", planId: "p-1", exerciseId: "e1", day: 0, exercise: 0, title: "S1", area: "guitar", topic: "guitar-scales", stars: 9, at: "2026-11-10T10:00:00Z" };
  await userData.putProgress(PLAYER_A, broken as unknown as ProgressEntry, now);
  const r = await playerProgress(deps({ userData }), { player: PLAYER_A });
  assert.ok(r);
  assert.equal(r.outcome.areas.flatMap((a) => a.topics).find((t) => t.topic === "guitar-scales")?.ratings, 0);
});
