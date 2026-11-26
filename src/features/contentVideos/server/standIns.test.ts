import { test } from "node:test";
import assert from "node:assert/strict";
import { standInSeed } from "../model/standIn";
import { stepsOfTool } from "../model/slot";
import { lookUp } from "./access";
import { memoryContentVideoRepo } from "./repo.memory";
import { contractBlocks, V } from "./repoContract";
import { seedStandIns } from "./standIns";

const NOW = new Date(Date.UTC(2026, 10, 26));
const ID = "0b6d2c4e-1f3a-4b5c-8d9e-0a1b2c3d4e5f";
const seed = standInSeed("picking-drill", ID)!;
const recorded = () => ({
  id: V.all, title: "Real", note: "", recordedBy: "user-1", madeFor: "tool:picking-drill", tool: null, steps: null,
  type: "video/webm", seconds: 30, width: 1280, height: 720, size: 9, blobPath: `content/videos/tool:picking-drill/${V.all}.webm`,
  overlay: null, cues: null, createdAt: new Date(Date.UTC(2026, 10, 20)),
});

test("a stand-in is added at every level, and a lookup hands its captions on", async () => {
  const repo = memoryContentVideoRepo(contractBlocks());
  assert.deepEqual(await seedStandIns(repo, [seed], NOW), [{ tool: "picking-drill", id: ID, did: "added", steps: stepsOfTool("picking-drill") }]);
  const out = await lookUp(repo, [{ key: "k", cells: [{ cell: 0, tool: "picking-drill", step: "picking-drill:beginner" }] }]);
  assert.equal(out.blocks.k[0].id, ID);
  assert.deepEqual(out.videos[ID].cues, seed.cues);
  assert.deepEqual(await seedStandIns(repo, [seed], NOW), [{ tool: "picking-drill", id: ID, did: "kept" }]);
});

test("a stand-in never takes a level off a recorded video", async () => {
  const repo = memoryContentVideoRepo(contractBlocks());
  await repo.create(recorded(), { kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner"] });
  const [r] = await seedStandIns(repo, [seed], NOW);
  assert.equal(r.did, "added");
  assert.ok(r.did === "added" && !r.steps!.includes("picking-drill:beginner"));
  assert.deepEqual((await repo.get(V.all))!.steps, ["picking-drill:beginner"]);
});

test("a tool whose every level has a video gets no stand-in", async () => {
  const repo = memoryContentVideoRepo(contractBlocks());
  await repo.create(recorded(), { kind: "tool", tool: "picking-drill", steps: stepsOfTool("picking-drill") });
  assert.deepEqual(await seedStandIns(repo, [seed], NOW), [{ tool: "picking-drill", id: ID, did: "covered" }]);
});

test("a seed with broken cues is not written", async () => {
  const repo = memoryContentVideoRepo(contractBlocks());
  assert.equal((await seedStandIns(repo, [{ ...seed, cues: [] }], NOW))[0].did, "bad");
  assert.equal(await repo.get(ID), null);
});
