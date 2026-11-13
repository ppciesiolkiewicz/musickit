import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_STAGE } from "@/features/stage";
import type { Block } from "@/features/plan/model/types";
import { blockFromStage, cellFromSubject, decodeNote, encodeNote, newCellId, noteFromHash, notePageParts } from "./note";

const BLOCK: Block = {
  title: "A minor pentatonic",
  choice: { open: { key: 9, scale: "minor-pentatonic" } },
  cells: [
    { type: "text", text: "Two shapes that sit next to each other." },
    { type: "section", heading: "Position 1", minutes: 3, cells: [{ type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } }] },
  ],
};

test("a note's link reads back as the same block", async () => {
  const s = await encodeNote(BLOCK);
  assert.match(s, /^[bc]/);
  assert.deepEqual(await decodeNote(s), { block: BLOCK });
});

test("a link of the old stage format says so; a broken one is an error", async () => {
  assert.deepEqual(await decodeNote("zAbCd"), { old: true });
  assert.deepEqual(await decodeNote("jAbCd"), { old: true });
  assert.ok("error" in (await decodeNote("%%")));
  assert.ok("error" in (await decodeNote("bnotbase64deflate")));
});

test("noteFromHash reads #note=", () => {
  assert.equal(noteFromHash("#note=bXYZ"), "bXYZ");
  assert.equal(noteFromHash("#other"), null);
});

test("a stage becomes a block: tools, text and the notice; the rest is left out", () => {
  const stage = {
    ...EMPTY_STAGE,
    layers: [
      { id: "a", subject: { kind: "text", text: "Hello" }, rect: { x: 0, y: 0, w: 1, h: 1 }, visible: true, z: 0 },
      { id: "b", subject: { kind: "tool", tool: { type: "scale-neck", scale: "major-ionian", key: 0 } }, rect: { x: 0, y: 0, w: 1, h: 1 }, visible: true, z: 1 },
      { id: "c", subject: { kind: "headphones" }, rect: { x: 0, y: 0, w: 1, h: 1 }, visible: true, z: 2 },
      { id: "d", subject: { kind: "camera" }, rect: { x: 0, y: 0, w: 1, h: 1 }, visible: true, z: 3 },
    ],
  } as never;
  const b = blockFromStage(stage);
  assert.deepEqual(b.cells.map((c) => c.type), ["text", "tool", "notice"]);
});

test("cellFromSubject: a chord box has no cell", () => {
  assert.equal(cellFromSubject({ kind: "chord", symbol: "G" }), null);
  assert.deepEqual(cellFromSubject({ kind: "headphones" }), { type: "notice", notice: "headphones" });
  assert.equal(cellFromSubject({ kind: "video", video: { source: "placeholder" } } as never)?.type, "tool");
});

test("newCellId is short and differs each time", () => {
  const a = newCellId(), b = newCellId();
  assert.match(a, /^[a-z0-9]{6,12}$/);
  assert.notEqual(a, b);
});

test("a note's page: its title, its first text as the line under it, the rest as the body", () => {
  const p = notePageParts(BLOCK);
  assert.deepEqual([p.title, p.intro], ["A minor pentatonic", "Two shapes that sit next to each other."]);
  assert.deepEqual(p.body.cells.map((c) => c.type), ["section"]);
  const noIntro = notePageParts({ title: "T", cells: [{ type: "notice", notice: "headphones" }] });
  assert.deepEqual([noIntro.title, noIntro.intro, noIntro.body.cells.length], ["T", null, 1]);
  assert.deepEqual(notePageParts({ title: "", cells: [] }).title, null);
});
