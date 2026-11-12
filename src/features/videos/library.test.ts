import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseVideoConfig } from "@/features/teachers/video/model/config";
import { buildScore } from "@/features/teachers/video/model/score";
import { VIDEO_BASE, VIDEO_LIBRARY, lengthLabel, libraryVideo, publishedVideos, videoUrl } from "./library";

const PLUGINS = ["scale", "modes", "chords", "progressions", "caged"];

test("every library video is a config in videos/, with its length and only formats the config renders", () => {
  for (const v of VIDEO_LIBRARY) {
    const config = parseVideoConfig(JSON.parse(readFileSync(`videos/${v.id}.json`, "utf8")), PLUGINS);
    assert.equal(config.name, v.id);
    assert.equal(v.seconds, Math.round(buildScore(config).durationMs / 1000), v.id);
    for (const f of v.published) assert.ok(f in config.formats, `${v.id} ${f}`);
  }
  assert.equal(new Set(VIDEO_LIBRARY.map((v) => v.id)).size, VIDEO_LIBRARY.length);
});

test("only a video with an uploaded format is offered, and its file is under the base", () => {
  assert.ok(publishedVideos().every((v) => v.published.length > 0));
  const v = libraryVideo("c-major-do-re-mi-long")!;
  assert.equal(videoUrl(v), `${VIDEO_BASE}/c-major-do-re-mi-long-9x16.mp4`);
  // a format that isn't uploaded falls back to one that is
  assert.equal(videoUrl(v, "16x9"), `${VIDEO_BASE}/c-major-do-re-mi-long-9x16.mp4`);
  assert.equal(videoUrl({ ...v, published: [] }), null);
  assert.equal(libraryVideo("nope"), null);
});

test("a length reads in minutes, or seconds under one", () => {
  assert.equal(lengthLabel(448), "7 min");
  assert.equal(lengthLabel(88), "1 min");
  assert.equal(lengthLabel(45), "45 s");
});
