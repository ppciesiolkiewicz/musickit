import assert from "node:assert/strict";
import { test } from "node:test";
import { readKeptTake, takeKey } from "./takeKey";

test("takeKey: a block's cell, or the tool; the ticked steps never count", () => {
  assert.equal(takeKey({ tool: "guitar-play-along", block: { id: "guitar-advanced-funk-riff-on-e9", cell: 1 } }), "guitar-advanced-funk-riff-on-e9:1");
  assert.equal(takeKey({ tool: "chord-changes", block: null }), "tool:chord-changes");
  const a = { tool: "chord-changes", steps: ["a:1"], block: null };
  const b = { tool: "chord-changes", steps: ["a:2", "none"], block: null };
  assert.equal(takeKey(a), takeKey(b));
});

test("readKeptTake: an old Take panel record opens as a kept take", () => {
  const blob = new Blob(["x"]);
  const t = readKeptTake({
    id: "x", blob, type: "video/webm", seconds: 8, at: 1, uploaded: true,
    withOverlay: { blob, type: "video/mp4", width: 640, height: 360 }, downbeat: 1.2, bpm: 90, bars: 2,
  });
  assert.ok(t);
  assert.equal(t.saved, true);
  assert.equal(t.fileUp, false);
  assert.equal(t.burned?.width, 640);
  assert.deepEqual(t.click, { downbeat: 1.2, bpm: 90, bars: 2 });
  assert.equal(t.overlay, null);
  assert.equal(t.width, 0);
  assert.equal(t.height, 0);
});

test("readKeptTake: a new record keeps its parts; no blob or no record is null", () => {
  const blob = new Blob(["x"]);
  const t = readKeptTake({ id: "tool:a", blob, type: "video/webm", seconds: 3, at: 2, width: 10, height: 20, saved: true, fileUp: true, videoId: "v", overlay: null, burned: null });
  assert.ok(t);
  assert.equal(t.width, 10);
  assert.equal(t.videoId, "v");
  assert.equal(t.click, undefined);
  assert.equal(readKeptTake(null), null);
  assert.equal(readKeptTake({ id: "x" }), null);
});
