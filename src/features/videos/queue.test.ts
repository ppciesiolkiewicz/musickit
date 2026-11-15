import { test } from "node:test";
import assert from "node:assert/strict";
import { afterFailure, afterSuccess, nextToUpload, type QueuedVideo } from "./queue";

const item = (id: string, savedAt: number, state: QueuedVideo["state"], extra: Partial<QueuedVideo> = {}): QueuedVideo => ({
  id,
  accountId: "u1",
  title: id,
  type: "video/webm",
  blob: new Blob(["x"]),
  seconds: 3,
  width: 640,
  height: 360,
  savedAt,
  state,
  tries: 0,
  ...extra,
});

test("nextToUpload takes the oldest waiting or failed, skipping one that is uploading", () => {
  const list = [item("new", 30, "waiting"), item("busy", 10, "uploading"), item("old", 20, "failed")];
  assert.equal(nextToUpload(list)?.id, "old");
  assert.equal(nextToUpload([item("busy", 10, "uploading")]), null);
  assert.equal(nextToUpload([]), null);
});

test("afterFailure marks it failed, counts the try and keeps the error", () => {
  const v = afterFailure(item("a", 1, "uploading", { tries: 1 }), "Videos can't be uploaded on this site yet.");
  assert.equal(v.state, "failed");
  assert.equal(v.tries, 2);
  assert.equal(v.error, "Videos can't be uploaded on this site yet.");
  assert.equal(afterFailure(item("b", 1, "uploading"), undefined).error, undefined);
});

test("afterFailure keeps that the file is already up", () => {
  assert.equal(afterFailure(item("a", 1, "uploading", { fileUp: true }), undefined).fileUp, true);
});

test("afterSuccess drops only that id", () => {
  const list = [item("a", 1, "waiting"), item("b", 2, "uploading"), item("c", 3, "failed")];
  assert.deepEqual(afterSuccess(list, "b").map((v) => v.id), ["a", "c"]);
  assert.equal(afterSuccess(list, "zzz").length, 3);
});
