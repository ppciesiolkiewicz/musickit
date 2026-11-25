import { test } from "node:test";
import assert from "node:assert/strict";
import type { Block } from "@/features/plan/model/types";
import type { Cell } from "@/features/plan/model/tools";
import { dayVideos, drawnAsks } from "./drawn";

const drill = { type: "picking-drill", strokes: "DU", level: "beginner", notesPerString: 4, bpm: 60 } as const;
const tool = (t: object) => ({ type: "tool", tool: t }) as unknown as Cell;
const text = { type: "text", text: "Play it." } as Cell;

test("the cells as written, numbered among the tool cells, a section's in its place", () => {
  const block: Block = { title: "T", cells: [text, tool({ type: "metronome", bpm: 60 }), { type: "section", heading: "H", cells: [text, tool(drill)] } as Cell] };
  const asks = drawnAsks(block, null, {}, {});
  assert.deepEqual(asks.map((a) => [a.cell, a.tool]), [[0, "metronome"], [1, "picking-drill"]]);
  assert.equal(asks[1].step, "picking-drill:beginner");
});

test("a level chip moves the step: the video follows the chips", () => {
  const block: Block = { title: "T", choice: { options: [{ level: 1 }, { level: 3 }] }, cells: [text, tool(drill)] };
  assert.equal(drawnAsks(block, null, {}, {})[0].step, "picking-drill:beginner");
  assert.equal(drawnAsks(block, null, {}, { block: 1 })[0].step, "picking-drill:advanced");
});

test("a day shows each video at its first place only, across exercises and cells", () => {
  const v = (cell: number, id: string) => ({ cell, id, from: "tool" as const, repeat: false });
  const shown = dayVideos(["e0", "e1", "e2"], { e1: [v(0, "a"), v(1, "b")], e0: [v(2, "b")], e2: [v(0, "a"), v(1, "c")] });
  assert.deepEqual(shown, { e0: { 2: "b" }, e1: { 0: "a" }, e2: { 1: "c" } });
});

test("a day ignores keys it wasn't asked about and odd keys stay own keys", () => {
  const v = { cell: 0, id: "a", from: "tool" as const, repeat: false };
  assert.deepEqual(dayVideos(["__proto__"], { __proto__: [v] } as never), {});
  const blocks: Record<string, typeof v[]> = {};
  Object.defineProperty(blocks, "__proto__", { value: [v], enumerable: true });
  assert.deepEqual(Object.entries(dayVideos(["__proto__"], blocks)), [["__proto__", { 0: "a" }]]);
});
