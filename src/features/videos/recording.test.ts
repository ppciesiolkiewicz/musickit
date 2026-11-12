import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVideoType, takeTitle, videoExtension, videoFileName } from "./recording";

test("the recorder picks the first type the browser has", () => {
  assert.equal(pickVideoType(() => true), "video/webm;codecs=vp9,opus");
  assert.equal(pickVideoType((t) => t === "video/mp4"), "video/mp4");
  assert.equal(pickVideoType(() => false), "");
});

test("a take's file name and default name", () => {
  assert.equal(videoExtension("video/mp4;codecs=avc1"), "mp4");
  assert.equal(videoExtension("video/webm;codecs=vp9,opus"), "webm");
  assert.equal(videoFileName("My Scales: take 2!", "video/webm"), "my-scales-take-2.webm");
  assert.equal(videoFileName("!!!", "video/mp4"), "video.mp4");
  assert.equal(takeTitle(new Date(2026, 10, 12, 14, 5)), "Video 12 Nov, 14:05");
});
