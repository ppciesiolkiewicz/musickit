import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { completeUpload, deleteMine, listMine, planUpload, renameMine, watch } from "./access";
import { MAX_VIDEO_BYTES, videoPath } from "./rules";

const ANN = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const V1 = "0b8a5c9e-3f1d-4a2b-9c7e-1d2f3a4b5c6d";
const V2 = "7e6d5c4b-3a2f-4e1d-8c9b-0a1b2c3d4e5f";
const NOW = new Date(Date.UTC(2026, 10, 15, 12));

const upload = (userId: string, id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: "Scales in G",
  type: "video/webm;codecs=vp9,opus",
  seconds: 42.4,
  width: 1280,
  height: 720,
  path: videoPath(userId, id, "video/webm;codecs=vp9,opus"),
  ...extra,
});

/** Blobs that "exist" in the fake private store, by path, with their size. */
const store = (blobs: Record<string, number>, access = "private") => ({
  dropped: [] as string[],
  async find(path: string) {
    return path in blobs ? { size: blobs[path], url: `https://abc123.${access}.blob.vercel-storage.com/${path}` } : null;
  },
  async drop(path: string) {
    this.dropped.push(path);
  },
});

async function withAnnsVideo() {
  const repo = memoryUserDataRepo();
  const done = await completeUpload(repo, ANN, upload(ANN, V1), store({ [videoPath(ANN, V1, "video/webm")]: 5000 }), NOW);
  assert.ok(done.ok);
  return repo;
}

test("completeUpload: the owner's finished upload becomes a row", async () => {
  const repo = memoryUserDataRepo();
  const done = await completeUpload(repo, ANN, upload(ANN, V1), store({ [videoPath(ANN, V1, "video/webm")]: 5000 }), NOW);
  assert.ok(done.ok);
  assert.deepEqual(done.video, { id: V1, title: "Scales in G", type: "video/webm;codecs=vp9,opus", seconds: 42, width: 1280, height: 720, size: 5000, savedAt: NOW.getTime() });
  const row = await repo.getVideo(V1);
  assert.equal(row?.userId, ANN);
  assert.equal(row?.blobPath, `videos/${ANN}/${V1}.webm`);
});

test("completeUpload: someone else's path is refused, and no row is written", async () => {
  const repo = memoryUserDataRepo();
  const bensPath = videoPath(BEN, V1, "video/webm");
  const done = await completeUpload(repo, ANN, upload(ANN, V1, { path: bensPath }), store({ [bensPath]: 5000 }), NOW);
  assert.ok(!done.ok);
  assert.equal(done.status, 403);
  assert.equal(await repo.getVideo(V1), null);
});

test("completeUpload: the path must be the id's own path", async () => {
  const repo = memoryUserDataRepo();
  const other = videoPath(ANN, V2, "video/webm");
  const done = await completeUpload(repo, ANN, upload(ANN, V1, { path: other }), store({ [other]: 5000 }), NOW);
  assert.ok(!done.ok);
  assert.equal(done.status, 403);
});

test("completeUpload: refused when the blob isn't there or is too big, or the type is wrong", async () => {
  const repo = memoryUserDataRepo();
  const missing = await completeUpload(repo, ANN, upload(ANN, V1), store({}), NOW);
  assert.ok(!missing.ok && missing.status === 400);
  const big = await completeUpload(repo, ANN, upload(ANN, V1), store({ [videoPath(ANN, V1, "video/webm")]: MAX_VIDEO_BYTES + 1 }), NOW);
  assert.ok(!big.ok && big.status === 400);
  const png = await completeUpload(repo, ANN, upload(ANN, V1, { type: "image/png", path: `videos/${ANN}/${V1}.webm` }), store({ [`videos/${ANN}/${V1}.webm`]: 10 }), NOW);
  assert.ok(!png.ok && png.status === 400);
  const junk = await completeUpload(repo, ANN, "junk", store({}), NOW);
  assert.ok(!junk.ok && junk.status === 400);
  assert.equal(await repo.getVideo(V1), null);
});

test("completeUpload: a taken id is a 409", async () => {
  const repo = await withAnnsVideo();
  const again = await completeUpload(repo, ANN, upload(ANN, V1), store({ [videoPath(ANN, V1, "video/webm")]: 5000 }), NOW);
  assert.ok(!again.ok && again.status === 409);
  const bens = await completeUpload(repo, BEN, upload(BEN, V1), store({ [videoPath(BEN, V1, "video/webm")]: 5000 }), NOW);
  assert.ok(!bens.ok && bens.status === 409);
  assert.equal((await repo.getVideo(V1))?.userId, ANN);
});

test("completeUpload: the title is cleaned", async () => {
  const repo = memoryUserDataRepo();
  const done = await completeUpload(repo, ANN, upload(ANN, V1, { title: "   " }), store({ [videoPath(ANN, V1, "video/webm")]: 1 }), NOW);
  assert.ok(done.ok && done.video.title === "My video");
});

test("planUpload: the owner's own path for a fresh id gets a token's rules", async () => {
  const repo = memoryUserDataRepo();
  const ok = await planUpload(repo, ANN, videoPath(ANN, V1, "video/webm;codecs=vp9,opus"), JSON.stringify({ id: V1, type: "video/webm;codecs=vp9,opus", size: 5000 }));
  assert.ok(ok.ok);
  assert.deepEqual(ok.allowedContentTypes, ["video/webm;codecs=vp9,opus", "video/webm"]);
});

test("planUpload: another user's path, a wrong type, a big file, junk or a taken id are refused", async () => {
  const repo = await withAnnsVideo();
  const payload = (o: Record<string, unknown>) => JSON.stringify({ id: V2, type: "video/webm", size: 5000, ...o });
  const bens = await planUpload(repo, ANN, videoPath(BEN, V2, "video/webm"), payload({}));
  assert.ok(!bens.ok && bens.status === 403);
  const png = await planUpload(repo, ANN, `videos/${ANN}/${V2}.webm`, payload({ type: "image/png" }));
  assert.ok(!png.ok && png.status === 400);
  const big = await planUpload(repo, ANN, videoPath(ANN, V2, "video/webm"), payload({ size: MAX_VIDEO_BYTES + 1 }));
  assert.ok(!big.ok && big.status === 400);
  const junk = await planUpload(repo, ANN, videoPath(ANN, V2, "video/webm"), "{");
  assert.ok(!junk.ok && junk.status === 400);
  const none = await planUpload(repo, ANN, videoPath(ANN, V2, "video/webm"), null);
  assert.ok(!none.ok && none.status === 400);
  const taken = await planUpload(repo, BEN, videoPath(BEN, V1, "video/webm"), payload({ id: V1 }));
  assert.ok(!taken.ok && taken.status === 409);
});

test("listMine: the owner sees their videos; another user sees none of them", async () => {
  const repo = await withAnnsVideo();
  assert.deepEqual((await listMine(repo, ANN)).map((v) => v.id), [V1]);
  assert.deepEqual(await listMine(repo, BEN), []);
});

test("renameMine: the owner can rename; another user gets null and changes nothing", async () => {
  const repo = await withAnnsVideo();
  assert.equal(await renameMine(repo, BEN, V1, "Mine now"), null);
  assert.equal((await repo.getVideo(V1))?.title, "Scales in G");
  const renamed = await renameMine(repo, ANN, V1, "  Scales,\n slower ");
  assert.equal(renamed?.title, "Scales, slower");
  assert.equal(await renameMine(repo, ANN, "not-an-id", "x"), null);
});

test("deleteMine: another user gets null and the row stays; the owner gets the row back to delete its file", async () => {
  const repo = await withAnnsVideo();
  assert.equal(await deleteMine(repo, BEN, V1), null);
  assert.ok(await repo.getVideo(V1));
  const gone = await deleteMine(repo, ANN, V1);
  assert.equal(gone?.blobPath, `videos/${ANN}/${V1}.webm`);
  assert.equal(await repo.getVideo(V1), null);
  assert.equal(await deleteMine(repo, ANN, V1), null);
  assert.equal(await deleteMine(repo, ANN, "../x"), null);
});

test("watch: with no share, only the owner; another user, a visitor and a bad id get null", async () => {
  const repo = await withAnnsVideo();
  assert.equal((await watch(repo, ANN, V1))?.id, V1);
  assert.equal(await watch(repo, BEN, V1), null);
  assert.equal(await watch(repo, null, V1), null);
  assert.equal(await watch(repo, ANN, V2), null);
  assert.equal(await watch(repo, ANN, "x' OR 1=1"), null);
});

test("completeUpload: a public blob is deleted and refused, and no row is written", async () => {
  const repo = memoryUserDataRepo();
  const path = videoPath(ANN, V1, "video/webm");
  const blobs = store({ [path]: 5000 }, "public");
  const done = await completeUpload(repo, ANN, upload(ANN, V1), blobs, NOW);
  assert.ok(!done.ok && done.status === 400);
  assert.deepEqual(blobs.dropped, [path]);
  assert.equal(await repo.getVideo(V1), null);
});

test("completeUpload: a public blob that can't be deleted is still refused", async () => {
  const repo = memoryUserDataRepo();
  const path = videoPath(ANN, V1, "video/webm");
  const blobs = { ...store({ [path]: 5000 }, "public"), drop: async () => Promise.reject(new Error("down")) };
  const done = await completeUpload(repo, ANN, upload(ANN, V1), blobs, NOW);
  assert.ok(!done.ok && done.status === 400);
  assert.equal(await repo.getVideo(V1), null);
});

test("completeUpload: a private blob is never deleted", async () => {
  const repo = memoryUserDataRepo();
  const path = videoPath(ANN, V1, "video/webm");
  const blobs = store({ [path]: 5000 });
  assert.ok((await completeUpload(repo, ANN, upload(ANN, V1), blobs, NOW)).ok);
  assert.deepEqual(blobs.dropped, []);
});
