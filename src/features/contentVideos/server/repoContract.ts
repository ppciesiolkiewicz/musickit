import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, type Cell, type PlainCell, type PlanTool } from "@/features/plan/model/tools";
import type { ContentVideoRepo, ContentVideoRow } from "./repo";
import type { BlockVideos, Target } from "./rules";

/** A block as a contract starts with it: the parts the repo reads. */
export interface ContractBlock { id: string; kind: "curated" | "hashed"; content: { title: string; cells: Cell[] }; videos?: BlockVideos | null }

/** Video ids (uuids, as `content_videos.id` is), named for the tests. */
export const V = {
  all: "00000000-0000-4000-8000-000000000001",
  beg: "00000000-0000-4000-8000-000000000002",
  adv: "00000000-0000-4000-8000-000000000003",
  ears: "00000000-0000-4000-8000-000000000004",
  band1: "00000000-0000-4000-8000-000000000005",
  band2: "00000000-0000-4000-8000-000000000006",
  riff: "00000000-0000-4000-8000-000000000007",
  riff2: "00000000-0000-4000-8000-000000000008",
  a: "00000000-0000-4000-8000-000000000009",
  b: "00000000-0000-4000-8000-00000000000a",
  unknown: "00000000-0000-4000-8000-0000000000ff",
} as const;

const ALL_STEPS = ["picking-drill:new", "picking-drill:beginner", "picking-drill:intermediate", "picking-drill:advanced", "none"];

const make = (name: keyof typeof TOOLS, raw: Record<string, unknown>): PlanTool => {
  const tool = TOOLS[name].parse({ type: name, ...raw });
  assert.ok(tool, `${name} parses`);
  return tool;
};
const toolCell = (tool: PlanTool): PlainCell => ({ type: "tool", tool });
const picking = () => toolCell(make("picking-drill", { level: "beginner", bpm: 60 }));
const band = () => toolCell(make("backing-band", { bpm: 60, key: "a", parts: { drone: "always" } }));

/** riff-x and song-y are curated with two tool cells (the second inside a section); hashed-x is hashed. */
export const contractBlocks = (): ContractBlock[] => [
  { id: "riff-x", kind: "curated", content: { title: "Riff", cells: [{ type: "text", text: "Play it." }, picking(), { type: "section", heading: "Then", cells: [band()] }] }, videos: null },
  { id: "song-y", kind: "curated", content: { title: "Song", cells: [picking(), band()] } },
  { id: "hashed-x", kind: "hashed", content: { title: "Mine", cells: [picking(), band()] } },
];

let clock = 0;
/** A row for the tool `madeFor` names; each one made later than the last. */
const video = (id: string, title: string, over: Partial<ContentVideoRow> = {}): ContentVideoRow => ({
  id, title, note: "", recordedBy: null, madeFor: "tool:picking-drill", tool: null, steps: null,
  type: "video/webm", seconds: 30, width: 1280, height: 720, size: 1_000_000,
  blobPath: `content/videos/${over.madeFor ?? "tool:picking-drill"}/${id}.webm`, overlay: null,
  createdAt: new Date(Date.UTC(2026, 10, 25, 12, 0, clock++)), ...over,
});
const tool = (steps: string[] | null, name = "picking-drill"): Target => ({ kind: "tool", tool: name, steps });
const cell = (blockId: string, n: number): Target => ({ kind: "cell", blockId, cell: n });

/** What every `ContentVideoRepo` must do, run against `make(blocks)`: the memory repo and Postgres (`npm run test:library-db`). */
export function contentVideoRepoContract(makeRepo: (blocks: ContractBlock[]) => Promise<ContentVideoRepo>): void {
  const fresh = () => makeRepo(contractBlocks());
  const stepsOf = async (repo: ContentVideoRepo) => Object.fromEntries((await repo.list()).map((v) => [v.title, v.steps]));

  describe("content video repo: one video per tool and step", () => {
    test("the first video with every step ticked covers the tool", async () => {
      const repo = await fresh();
      // the row's own tool and steps are ignored: the target decides them
      assert.deepEqual(await repo.create(video(V.all, "All", { tool: "nonsense", steps: ["x"] }), tool(ALL_STEPS)), { ok: true, lost: [] });
      const got = (await repo.get(V.all))!;
      assert.equal(got.tool, "picking-drill");
      assert.deepEqual(got.steps, ALL_STEPS);
      assert.equal(got.title, "All");
      assert.equal(got.blobPath, `content/videos/tool:picking-drill/${V.all}.webm`);
    });

    test("a level video takes its step off the every-step video", async () => {
      const repo = await fresh();
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      const res = await repo.create(video(V.beg, "Beginner"), tool(["picking-drill:beginner"]));
      assert.deepEqual(res, { ok: true, lost: [{ id: V.all, title: "All", steps: ["picking-drill:beginner"], emptied: false }] });
      assert.deepEqual((await repo.get(V.all))!.steps, ["picking-drill:new", "picking-drill:intermediate", "picking-drill:advanced", "none"]);
      assert.deepEqual((await repo.get(V.beg))!.steps, ["picking-drill:beginner"]);
    });

    test("a video left with no steps keeps its row with no tool", async () => {
      const repo = await fresh();
      await repo.create(video(V.beg, "Beginner"), tool(["picking-drill:beginner"]));
      await repo.create(video(V.adv, "Advanced"), tool(["picking-drill:advanced"]));
      const res = await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      assert.deepEqual(res, {
        ok: true,
        lost: [
          { id: V.beg, title: "Beginner", steps: ["picking-drill:beginner"], emptied: true },
          { id: V.adv, title: "Advanced", steps: ["picking-drill:advanced"], emptied: true },
        ],
      });
      const beg = (await repo.get(V.beg))!;
      assert.equal(beg.tool, null);
      assert.equal(beg.steps, null);
      assert.equal(beg.title, "Beginner");
    });

    test("another tool's videos are untouched", async () => {
      const repo = await fresh();
      await repo.create(video(V.ears, "Ears", { madeFor: "tool:interval-ears" }), tool(["interval-ears:1", "none"], "interval-ears"));
      await repo.create(video(V.band1, "Band", { madeFor: "tool:backing-band" }), tool(null, "backing-band"));
      assert.deepEqual(await repo.create(video(V.all, "All"), tool(ALL_STEPS)), { ok: true, lost: [] });
      const ears = (await repo.get(V.ears))!;
      assert.deepEqual([ears.tool, ears.steps], ["interval-ears", ["interval-ears:1", "none"]]);
      const b = (await repo.get(V.band1))!;
      assert.deepEqual([b.tool, b.steps], ["backing-band", null]);
    });

    test("a tool with no ladder: the new video replaces the old", async () => {
      const repo = await fresh();
      await repo.create(video(V.band1, "Band one", { madeFor: "tool:backing-band" }), tool(null, "backing-band"));
      const res = await repo.create(video(V.band2, "Band two", { madeFor: "tool:backing-band" }), tool(null, "backing-band"));
      assert.deepEqual(res, { ok: true, lost: [{ id: V.band1, title: "Band one", steps: [], emptied: true }] });
      const old = (await repo.get(V.band1))!;
      assert.deepEqual([old.tool, old.steps], [null, null]);
      const now = (await repo.get(V.band2))!;
      assert.deepEqual([now.tool, now.steps], ["backing-band", null]);
    });

    test("a taken id or path changes nothing", async () => {
      const repo = await fresh();
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      await repo.create(video(V.beg, "Beginner"), tool(["picking-drill:beginner"]));
      const before = await stepsOf(repo);
      // the same id, another path
      assert.deepEqual(await repo.create(video(V.beg, "Again", { blobPath: "content/videos/tool:picking-drill/other.webm" }), tool(["picking-drill:new"])), { ok: false, reason: "taken" });
      // a new id, a stored path
      assert.deepEqual(await repo.create(video(V.adv, "Advanced", { blobPath: `content/videos/tool:picking-drill/${V.all}.webm` }), tool(["picking-drill:advanced"])), { ok: false, reason: "taken" });
      // a cell target with a taken id leaves the block alone
      assert.deepEqual(await repo.create(video(V.all, "Riff", { madeFor: "riff-x" }), cell("riff-x", 0)), { ok: false, reason: "taken" });
      assert.deepEqual(await stepsOf(repo), before);
      assert.equal((await repo.list()).length, 2);
      assert.equal((await repo.get(V.beg))!.title, "Beginner");
      assert.equal(await repo.get(V.adv), null);
      assert.deepEqual((await repo.forLookup(["riff-x"], [])).own, {});
    });
  });

  describe("content video repo: a block's own video", () => {
    test("a cell target points the curated block's cell at the video", async () => {
      const repo = await fresh();
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      const res = await repo.create(video(V.riff, "Riff", { madeFor: "riff-x", tool: "picking-drill", steps: ["none"] }), cell("riff-x", 1));
      assert.deepEqual(res, { ok: true, lost: [] });
      const row = (await repo.get(V.riff))!;
      assert.deepEqual([row.tool, row.steps], [null, null]);
      assert.deepEqual((await repo.pointers(V.riff)).cells, [{ blockId: "riff-x", cell: 1 }]);
      assert.deepEqual((await repo.forLookup(["riff-x"], [])).own, { "riff-x": { 1: V.riff } });
      // the tool's video is untouched
      assert.deepEqual((await repo.get(V.all))!.steps, ALL_STEPS);
      // a new video for the same cell takes it over; the old one keeps its row
      assert.deepEqual(await repo.create(video(V.riff2, "Riff two", { madeFor: "riff-x" }), cell("riff-x", 1)), { ok: true, lost: [] });
      assert.deepEqual((await repo.forLookup(["riff-x"], [])).own, { "riff-x": { 1: V.riff2 } });
      assert.equal((await repo.get(V.riff))!.title, "Riff");
      assert.deepEqual(await repo.pointers(V.riff), { tool: null, cells: [] });
    });

    test("a cell target on a hashed or unknown block is no-block; past the block's tool cells is no-cell", async () => {
      const repo = await fresh();
      assert.deepEqual(await repo.create(video(V.a, "A", { madeFor: "hashed-x" }), cell("hashed-x", 0)), { ok: false, reason: "no-block" });
      assert.deepEqual(await repo.create(video(V.a, "A", { madeFor: "nowhere" }), cell("nowhere", 0)), { ok: false, reason: "no-block" });
      // riff-x has two tool cells (the text cell is not one; the section's is)
      assert.deepEqual(await repo.create(video(V.a, "A", { madeFor: "riff-x" }), cell("riff-x", 2)), { ok: false, reason: "no-cell" });
      assert.deepEqual(await repo.list(), []);
      assert.deepEqual((await repo.forLookup(["riff-x", "hashed-x"], [])).own, {});
    });
  });

  describe("content video repo: edit, remove and lookup", () => {
    test("edit changes the title and note only", async () => {
      const repo = await fresh();
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      const got = await repo.edit(V.all, { title: "Every step", note: "Slow." });
      assert.deepEqual([got?.title, got?.note, got?.steps], ["Every step", "Slow.", ALL_STEPS]);
      assert.deepEqual(await repo.get(V.all), got);
      assert.equal(await repo.edit(V.unknown, { title: "x", note: "" }), null);
      assert.equal(await repo.get("not-a-uuid"), null);
    });

    test("remove is refused while pointed at", async () => {
      const repo = await fresh();
      await repo.create(video(V.beg, "Beginner"), tool(["picking-drill:beginner"]));
      await repo.create(video(V.riff, "Riff", { madeFor: "riff-x" }), cell("riff-x", 0));
      const refused = await repo.remove(V.beg);
      assert.deepEqual(refused, { ok: false, pointers: { tool: { tool: "picking-drill", steps: ["picking-drill:beginner"] }, cells: [] } });
      const cellRefused = await repo.remove(V.riff);
      assert.equal(cellRefused?.ok, false);
      assert.deepEqual(cellRefused?.ok === false && cellRefused.pointers.cells, [{ blockId: "riff-x", cell: 0 }]);
      assert.ok(await repo.get(V.beg));
      assert.ok(await repo.get(V.riff));
      // emptied by a later video: removable
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      const emptied = (await repo.get(V.beg))!;
      assert.deepEqual(await repo.remove(V.beg), { ok: true, row: emptied });
      assert.equal(await repo.get(V.beg), null);
      assert.equal(await repo.remove(V.unknown), null);
      assert.equal(await repo.remove("not-a-uuid"), null);
    });

    test("forLookup gives own cells of curated blocks only, and the rows of the asked tools and of those cells", async () => {
      const blocks = contractBlocks();
      // a hashed block's cells are never its own video, even when set by hand
      blocks[2].videos = { cells: { "0": V.b } };
      const repo = await makeRepo(blocks);
      await repo.create(video(V.all, "All"), tool(ALL_STEPS));
      await repo.create(video(V.ears, "Ears", { madeFor: "tool:interval-ears" }), tool(["interval-ears:1"], "interval-ears"));
      await repo.create(video(V.band1, "Band", { madeFor: "tool:backing-band" }), tool(null, "backing-band"));
      await repo.create(video(V.riff, "Riff", { madeFor: "riff-x" }), cell("riff-x", 0));
      await repo.create(video(V.b, "Song", { madeFor: "song-y" }), cell("song-y", 1));
      const { own, rows } = await repo.forLookup(["riff-x", "hashed-x", "nowhere"], ["picking-drill", "backing-band"]);
      assert.deepEqual(own, { "riff-x": { 0: V.riff } });
      // newest first: the riff, the band, every step
      assert.deepEqual(rows.map((r) => r.id), [V.riff, V.band1, V.all]);
      assert.deepEqual(await repo.forLookup([], []), { own: {}, rows: [] });
      assert.deepEqual((await repo.list()).map((r) => r.id), [V.b, V.riff, V.band1, V.ears, V.all]);
    });

    test("two saves at once leave each step on one video", async () => {
      const repo = await fresh();
      const rowA = video(V.a, "A"), rowB = video(V.b, "B");
      await Promise.all([repo.create(rowA, tool(["picking-drill:beginner", "none"])), repo.create(rowB, tool(["picking-drill:beginner"]))]);
      const holders = (await repo.list()).filter((v) => v.steps?.includes("picking-drill:beginner"));
      assert.equal(holders.length, 1);
      // and two first saves of a tool with no ladder leave one holder
      await Promise.all([
        repo.create(video(V.band1, "Band one", { madeFor: "tool:backing-band" }), tool(null, "backing-band")),
        repo.create(video(V.band2, "Band two", { madeFor: "tool:backing-band" }), tool(null, "backing-band")),
      ]);
      assert.equal((await repo.list()).filter((v) => v.tool === "backing-band").length, 1);
    });
  });
}
