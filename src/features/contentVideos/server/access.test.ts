import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { BlobLookup } from "@/features/videos/server/access";
import { completeContentUpload, deleteContentVideo, editContentVideo, planContentUpload } from "./access";
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
