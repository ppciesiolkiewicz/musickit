import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_VIDEO_BYTES, VIDEO_TYPES, checkUpload, isPrivateBlobUrl, isVideoId, ownsPath, videoPath } from "./rules";

const ID = "0b8a5c9e-3f1d-4a2b-9c7e-1d2f3a4b5c6d";
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

test("checkUpload: a webm or mp4 under the cap with a UUID id is ok", () => {
  assert.deepEqual(checkUpload({ id: ID, type: "video/webm;codecs=vp9,opus", size: 1000 }), { ok: true });
  assert.deepEqual(checkUpload({ id: ID, type: "video/mp4", size: MAX_VIDEO_BYTES }), { ok: true });
});

test("checkUpload: refuses another type, too big, an empty file and a non-UUID id", () => {
  assert.equal(checkUpload({ id: ID, type: "image/png", size: 1000 }).ok, false);
  assert.equal(checkUpload({ id: ID, type: "video/webm", size: MAX_VIDEO_BYTES + 1 }).ok, false);
  assert.equal(checkUpload({ id: ID, type: "video/webm", size: 0 }).ok, false);
  assert.equal(checkUpload({ id: "not-a-uuid", type: "video/webm", size: 1000 }).ok, false);
  assert.equal(checkUpload({ id: "../x", type: "video/webm", size: 1000 }).ok, false);
  assert.equal(checkUpload({ id: ID.toUpperCase(), type: "video/webm", size: 1000 }).ok, false);
});

test("VIDEO_TYPES takes webm and mp4 with or without codecs", () => {
  assert.ok(VIDEO_TYPES.test("video/webm"));
  assert.ok(VIDEO_TYPES.test("video/mp4;codecs=avc1"));
  assert.ok(!VIDEO_TYPES.test("video/quicktime"));
  assert.ok(!VIDEO_TYPES.test("text/html;video/webm"));
});

test("videoPath: videos/<user>/<id>.<ext> from the type", () => {
  assert.equal(videoPath(U1, ID, "video/webm;codecs=vp9,opus"), `videos/${U1}/${ID}.webm`);
  assert.ok(videoPath("u1", ID, "video/webm;codecs=vp9,opus").endsWith(".webm"));
  assert.equal(videoPath(U1, ID, "video/mp4"), `videos/${U1}/${ID}.mp4`);
});

test("ownsPath: only the user's own folder, one plain file", () => {
  assert.equal(ownsPath("u1", "videos/u2/x.webm"), false);
  assert.equal(ownsPath(U1, `videos/${U1}/${ID}.webm`), true);
  assert.equal(ownsPath(U1, `videos/${U2}/${ID}.webm`), false);
  assert.equal(ownsPath(U1, `videos/${U1}/../${U2}/${ID}.webm`), false);
  assert.equal(ownsPath(U1, `videos/${U1}/${ID}.webm/x`), false);
  assert.equal(ownsPath(U1, `videos/${U1}/${ID}.mov`), false);
  assert.equal(ownsPath(U1, `nam/${U1}/${ID}.webm`), false);
  assert.equal(ownsPath("", `videos//${ID}.webm`), false);
  assert.equal(ownsPath(U1, 42 as unknown as string), false);
});

test("isVideoId: a lower-case UUID", () => {
  assert.ok(isVideoId(ID));
  assert.ok(!isVideoId("x"));
  assert.ok(!isVideoId(null));
});

test("isPrivateBlobUrl: only a private store's https URL", () => {
  assert.ok(isPrivateBlobUrl(`https://abc123.private.blob.vercel-storage.com/videos/${U1}/${ID}.webm`));
  assert.ok(!isPrivateBlobUrl(`https://abc123.public.blob.vercel-storage.com/videos/${U1}/${ID}.webm`));
  assert.ok(!isPrivateBlobUrl(`http://abc123.private.blob.vercel-storage.com/x.webm`));
  assert.ok(!isPrivateBlobUrl("https://private.blob.vercel-storage.com.evil.test/x.webm"));
  assert.ok(!isPrivateBlobUrl("https://abc.private.blob.vercel-storage.com@evil.test/x"));
  assert.ok(!isPrivateBlobUrl("not a url"));
  assert.ok(!isPrivateBlobUrl(undefined));
});
