import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { BlobLookup } from "@/features/videos/server/access";
import { completeContentUpload, deleteContentVideo, editContentVideo, lookUp, planContentUpload, readLookup } from "./access";
import { memoryContentVideoRepo } from "./repo.memory";
import { contractBlocks, V } from "./repoContract";
import { contentVideoPath } from "./rules";

const MADE = "tool:picking-drill";
const PRIVATE = "https://abc.private.blob.vercel-storage.com/x";
const PUBLIC = "https://abc.public.blob.vercel-storage.com/x";
const NOW = new Date(Date.UTC(2026, 10, 25));
const STEPS = ["picking-drill:new", "picking-drill:beginner"];

const fresh = () => memoryContentVideoRepo(contractBlocks());
const payload = (over: Record<string, unknown> = {}) => JSON.stringify({ id: V.a, type: "video/webm", size: 1000, madeFor: MADE, ...over });
const body = (over: Record<string, unknown> = {}) => ({
  id: V.a, title: "  Picking  ", note: " slow ", type: "video/webm", seconds: 30, width: 1280, height: 720,
  path: contentVideoPath(MADE, V.a, "video/webm"), madeFor: MADE, target: { kind: "tool", tool: "picking-drill", steps: STEPS }, ...over,
});
const blobs = (url = PRIVATE, size = 4242): BlobLookup & { dropped: string[] } => {
  const dropped: string[] = [];
  return { dropped, find: async () => ({ size, url }), drop: async (p) => void dropped.push(p) };
};
const save = (repo = fresh(), over: Record<string, unknown> = {}) => completeContentUpload(repo, "user-1", body(over), blobs(), NOW);

describe("content video access", () => {
  test("the upload is planned only for this video's own path", async () => {
    const repo = fresh();
    const ok = await planContentUpload(repo, contentVideoPath(MADE, V.a, "video/webm"), payload());
    assert.deepEqual(ok, { ok: true, allowedContentTypes: ["video/webm"] });
    for (const path of [contentVideoPath("tool:backing-band", V.a, "video/webm"), contentVideoPath(MADE, V.b, "video/webm"), `videos/user-1/${V.a}.webm`]) {
      const no = await planContentUpload(repo, path, payload());
      assert.ok(!no.ok && no.status === 403, path);
    }
  });

  test("a taken id is refused before the upload", async () => {
    const repo = fresh();
    assert.ok((await save(repo)).ok);
    const no = await planContentUpload(repo, contentVideoPath(MADE, V.a, "video/webm"), payload());
    assert.ok(!no.ok && no.status === 409);
  });

  test("saving writes the row with the target's steps and says what lost them", async () => {
    const repo = fresh();
    assert.ok((await save(repo)).ok);
    const second = await completeContentUpload(repo, "user-1", body({ id: V.b, path: contentVideoPath(MADE, V.b, "video/webm"), target: { kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner"] } }), blobs(), NOW);
    assert.ok(second.ok);
    assert.deepEqual(second.video.steps, ["picking-drill:beginner"]);
    assert.equal(second.video.tool, "picking-drill");
    assert.equal(second.video.title, "Picking");
    assert.equal(second.video.note, "slow");
    assert.equal(second.video.overlay, null);
    assert.equal(second.lost.length, 1);
    assert.equal(second.lost[0].id, V.a);
    assert.deepEqual(second.lost[0].steps, ["picking-drill:beginner"]);
    assert.equal((await repo.get(V.a))!.recordedBy, "user-1");
  });

  test("the stored size is the store's, not the browser's", async () => {
    const done = await completeContentUpload(fresh(), "user-1", body({ size: 5 }), blobs(PRIVATE, 4242), NOW);
    assert.ok(done.ok);
    assert.equal(done.video.size, 4242);
  });

  test("a public blob is deleted and refused", async () => {
    const b = blobs(PUBLIC);
    const done = await completeContentUpload(fresh(), "user-1", body(), b, NOW);
    assert.ok(!done.ok && done.status === 400);
    assert.deepEqual(b.dropped, [contentVideoPath(MADE, V.a, "video/webm")]);
  });

  test("a file that isn't there is refused", async () => {
    const none: BlobLookup = { find: async () => null, drop: async () => {} };
    const done = await completeContentUpload(fresh(), "user-1", body(), none, NOW);
    assert.deepEqual(done, { ok: false, status: 400, error: "The upload didn't finish. Try again." });
  });

  test("a target for another made_for is a bad request", async () => {
    const done = await save(fresh(), { target: { kind: "tool", tool: "backing-band", steps: null } });
    assert.deepEqual(done, { ok: false, status: 400, error: "Bad request." });
  });

  test("a path that isn't the id's own is refused", async () => {
    const done = await save(fresh(), { path: contentVideoPath(MADE, V.b, "video/webm") });
    assert.ok(!done.ok && done.status === 403);
  });

  test("a cell save on a block that isn't stored says to seed", async () => {
    const done = await save(fresh(), { madeFor: "no-such-riff", path: contentVideoPath("no-such-riff", V.a, "video/webm"), target: { kind: "cell", blockId: "no-such-riff", cell: 0 } });
    assert.deepEqual(done, { ok: false, status: 409, error: "This exercise isn't in the library here yet. Run db:seed-blocks, then save again." });
  });

  test("a cell past the block's tool cells says it has changed", async () => {
    const done = await save(fresh(), { madeFor: "riff-x", path: contentVideoPath("riff-x", V.a, "video/webm"), target: { kind: "cell", blockId: "riff-x", cell: 5 } });
    assert.deepEqual(done, { ok: false, status: 409, error: "This exercise has changed and that tool isn't where it was. Reload and save again." });
  });

  test("edit trims the title and the note; an unknown id is null", async () => {
    const repo = fresh();
    await save(repo);
    const got = await editContentVideo(repo, V.a, { title: "  New  name ", note: "  hi  " });
    assert.equal(got?.title, "New name");
    assert.equal(got?.note, "hi");
    assert.equal(await editContentVideo(repo, V.unknown, { title: "x", note: "" }), null);
    assert.equal(await editContentVideo(repo, "not-an-id", { title: "x", note: "" }), null);
  });

  test("delete names what points at it", async () => {
    const repo = fresh();
    await save(repo);
    const out = await deleteContentVideo(repo, V.a);
    assert.ok(out && !out.ok);
    assert.equal(out.status, 409);
    assert.equal(out.error, "A tool or an exercise still shows this video. Give its levels to another video first.");
    assert.deepEqual(out.pointers, await repo.pointers(V.a));
    assert.ok(await repo.get(V.a));
  });

  test("a video nothing points at deletes", async () => {
    const repo = fresh();
    await save(repo);
    await completeContentUpload(repo, "user-1", body({ id: V.b, path: contentVideoPath(MADE, V.b, "video/webm") }), blobs(), NOW);
    const out = await deleteContentVideo(repo, V.a);
    assert.ok(out?.ok);
    assert.equal(await repo.get(V.a), null);
    assert.equal(await deleteContentVideo(repo, V.a), null);
    assert.equal(await deleteContentVideo(repo, "nope"), null);
  });
});

const okCell = { cell: 0, tool: "picking-drill", step: "picking-drill:beginner" };
const okBlock = { key: "a", blockId: "riff-x", cells: [okCell] };

describe("the lookup", () => {
  test("readLookup refuses junk and anything too large", () => {
    const bad: unknown[] = [null, [], {}, { blocks: "x" }, { blocks: Array(61).fill(okBlock) }, { blocks: [{ ...okBlock, cells: Array(25).fill(okCell) }] }, { blocks: [okBlock, okBlock] },
      { blocks: [{ ...okBlock, cells: [{ cell: -1, tool: "x", step: null }] }] }, { blocks: [{ ...okBlock, cells: [{ cell: 24, tool: "x", step: null }] }] },
      { blocks: [{ ...okBlock, cells: [{ cell: 1.5, tool: "x", step: null }] }] }, { blocks: [{ ...okBlock, key: "" }] }, { blocks: [{ ...okBlock, key: "k".repeat(201) }] },
      { blocks: [{ ...okBlock, blockId: 5 }] }, { blocks: [{ ...okBlock, cells: [{ cell: 0, tool: "t".repeat(81), step: null }] }] },
      { blocks: [{ ...okBlock, cells: [{ cell: 0, tool: "x", step: 3 }] }] }];
    for (const b of bad) assert.equal(readLookup(b), null, JSON.stringify(b).slice(0, 80));
    assert.deepEqual(readLookup({ blocks: [okBlock, { key: "b", cells: [] }] }), [okBlock, { key: "b", cells: [] }]);
  });

  const setup = async () => {
    const repo = fresh();
    await repo.create({ ...rowOf(V.all), title: "All" }, { kind: "tool", tool: "picking-drill", steps: STEPS });
    await repo.create({ ...rowOf(V.riff), title: "Riff" }, { kind: "cell", blockId: "riff-x", cell: 0 });
    return repo;
  };
  const rowOf = (id: string) => ({ id, title: "t", note: "n", recordedBy: "user-1", madeFor: MADE, tool: null, steps: null, type: "video/webm", seconds: 30, width: 1280, height: 720, size: 99, blobPath: `content/videos/${MADE}/${id}.webm`, overlay: null, createdAt: NOW });
  const cells = [{ cell: 0, tool: "picking-drill", step: "picking-drill:beginner" }];

  test("lookUp answers per block key, each video once", async () => {
    const repo = await setup();
    const out = await lookUp(repo, [{ key: "one", blockId: "song-y", cells }, { key: "two", blockId: "song-y", cells }]);
    assert.deepEqual(out.blocks, { one: [{ cell: 0, id: V.all, from: "tool", repeat: false }], two: [{ cell: 0, id: V.all, from: "tool", repeat: false }] });
    assert.deepEqual(Object.keys(out.videos), [V.all]);
  });

  test("a block's own video shows only under that block's id", async () => {
    const repo = await setup();
    const own = await lookUp(repo, [{ key: "k", blockId: "riff-x", cells }]);
    assert.deepEqual(own.blocks.k, [{ cell: 0, id: V.riff, from: "block", repeat: false }]);
    assert.deepEqual(Object.keys(own.videos), [V.riff]);
    for (const blockId of [undefined, "hashed-x", "other"]) {
      const out = await lookUp(repo, [{ key: "k", blockId, cells }]);
      assert.deepEqual(out.blocks.k, [{ cell: 0, id: V.all, from: "tool", repeat: false }]);
    }
  });

  test("an unknown tool or block id is simply empty", async () => {
    const repo = await setup();
    const out = await lookUp(repo, [{ key: "k", blockId: "nope", cells: [{ cell: 0, tool: "no-such-tool", step: null }] }, { key: "e", cells: [] }]);
    assert.deepEqual(out, { blocks: { k: [], e: [] }, videos: {} });
  });

  test("the repo is asked once, with unique block ids and tools", async () => {
    const repo = await setup();
    const asked: unknown[] = [];
    const spy = { ...repo, forLookup: (b: string[], t: string[]) => (asked.push([b, t]), repo.forLookup(b, t)) };
    await lookUp(spy, [{ key: "1", blockId: "a", cells }, { key: "2", blockId: "a", cells: [...cells, { cell: 1, tool: "backing-band", step: null }] }, { key: "3", cells }]);
    assert.deepEqual(asked, [[["a"], ["picking-drill", "backing-band"]]]);
  });

  test("the answer carries no path, recorder or size", async () => {
    const repo = await setup();
    const out = await lookUp(repo, [{ key: "k", cells }]);
    assert.deepEqual(Object.keys(out.videos[V.all]).sort(), ["height", "id", "note", "overlay", "seconds", "title", "width"]);
  });
});
